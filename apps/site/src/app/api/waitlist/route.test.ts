import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { BOOKING_URL } from "@/lib/links";
import { POST } from "./route";

const localStoreFile = path.join(process.cwd(), ".waitlist-dev.json");
const ENV_KEYS = [
  "NODE_ENV",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "RESEND_NOTIFY_EMAIL",
  "RESEND_REPLY_TO",
  "RESEND_SEGMENT_ID",
] as const;
const savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  if (existsSync(localStoreFile)) rmSync(localStoreFile, { force: true });
  for (const key of ENV_KEYS) {
    const value = savedEnv[key];
    if (value === undefined) delete process.env[key];
    // Object.assign: Next types NODE_ENV as read-only, but tests need to flip it.
    else Object.assign(process.env, { [key]: value });
  }
});

let ipCounter = 0;
function request(body: unknown, headers: Record<string, string> = {}): Request {
  ipCounter += 1;
  return new Request("http://localhost:3000/api/waitlist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-real-ip": `198.51.100.${ipCounter}`,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

interface Call {
  url: string;
  method: string;
  body: unknown;
  idempotencyKey: string | null;
}

/** Replaces fetch with a Resend stand-in; `contactStatus` controls POST /contacts. */
function mockResend(contactStatus = 201, contactBody: unknown = { object: "contact", id: "c_1" }) {
  const calls: Call[] = [];
  const fake = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : input.toString();
    const body: unknown = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    calls.push({
      url,
      method: init?.method ?? "GET",
      body,
      idempotencyKey: new Headers(init?.headers).get("Idempotency-Key"),
    });
    if (url.endsWith("/contacts")) {
      return new Response(JSON.stringify(contactBody), { status: contactStatus });
    }
    if (url.includes("/contacts/")) {
      return new Response(JSON.stringify({ object: "contact", id: "c_1" }), { status: 200 });
    }
    return new Response(JSON.stringify({ id: "e_1" }), { status: 200 });
  };
  const spy = spyOn(globalThis, "fetch").mockImplementation(
    Object.assign(fake, { preconnect: globalThis.fetch.preconnect })
  );
  return { calls, restore: () => spy.mockRestore() };
}

function useResend(extra: Record<string, string> = {}) {
  process.env.RESEND_API_KEY = "re_test_secret_key";
  process.env.RESEND_FROM_EMAIL = "TydBase <beta@notifications.example.dev>";
  delete process.env.RESEND_NOTIFY_EMAIL;
  delete process.env.RESEND_REPLY_TO;
  delete process.env.RESEND_SEGMENT_ID;
  Object.assign(process.env, extra);
}

describe("POST /api/waitlist", () => {
  test("rejects a malformed email with 400", async () => {
    delete process.env.RESEND_API_KEY;
    const res = await POST(request({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false });
  });

  test("local dev store: 201 for new, 200 for a case-insensitive duplicate", async () => {
    delete process.env.RESEND_API_KEY;
    const first = await POST(request({ email: "lead@northstar.dev", source: "hero" }));
    expect(first.status).toBe(201);
    expect(await first.json()).toMatchObject({
      ok: true,
      alreadyJoined: false,
      provider: "local-dev",
    });

    const again = await POST(request({ email: "LEAD@northstar.dev", source: "close" }));
    expect(again.status).toBe(200);
    expect(await again.json()).toMatchObject({ ok: true, alreadyJoined: true });
  });

  test("production without RESEND_API_KEY fails closed with 503 and writes nothing", async () => {
    delete process.env.RESEND_API_KEY;
    Object.assign(process.env, { NODE_ENV: "production" });
    const errorLog = spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(request({ email: "prod@example.dev" }));
    errorLog.mockRestore();
    expect(res.status).toBe(503);
    expect(existsSync(localStoreFile)).toBe(false);
  });

  test("Resend: contact with source and segment, confirmation with reply_to, team notification", async () => {
    useResend({
      RESEND_NOTIFY_EMAIL: "team@example.dev",
      RESEND_REPLY_TO: "hello@example.dev",
      RESEND_SEGMENT_ID: "seg_beta",
    });
    const resend = mockResend();
    const res = await POST(request({ email: "Team@KestrelPay.io", source: "hero?ref=hn" }));
    resend.restore();

    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ ok: true, provider: "resend", alreadyJoined: false });
    expect(resend.calls[0]).toEqual({
      url: "https://api.resend.com/contacts",
      method: "POST",
      idempotencyKey: null,
      body: {
        email: "team@kestrelpay.io",
        unsubscribed: false,
        properties: { source: "hero?ref=hn" },
        segments: [{ id: "seg_beta" }],
      },
    });
    const emails = resend.calls.slice(1);
    expect(emails.map((c) => c.idempotencyKey ?? "").toSorted()).toEqual([
      "tydbase-waitlist-notify-team@kestrelpay.io",
      "tydbase-waitlist-team@kestrelpay.io",
    ]);
    expect(
      emails.find((c) => c.idempotencyKey === "tydbase-waitlist-team@kestrelpay.io")?.body
    ).toMatchObject({
      to: ["team@kestrelpay.io"],
      reply_to: "hello@example.dev",
      text: expect.stringContaining(BOOKING_URL),
      html: expect.stringContaining(`href="${BOOKING_URL}"`),
    });
    // Replying to the notification answers the person who signed up.
    expect(
      emails.find((c) => c.idempotencyKey === "tydbase-waitlist-notify-team@kestrelpay.io")?.body
    ).toMatchObject({ to: ["team@example.dev"], reply_to: "team@kestrelpay.io" });
  });

  test("step 2: patches team size and worry onto the contact and forwards them to the team", async () => {
    useResend({ RESEND_NOTIFY_EMAIL: "team@example.dev" });
    const resend = mockResend();
    const res = await POST(
      request({
        email: "lead@kestrelpay.io",
        teamSize: "2-10",
        worry: "  Claude Code on staging  ",
      })
    );
    resend.restore();

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, provider: "resend" });
    expect(resend.calls[0]).toEqual({
      url: "https://api.resend.com/contacts/lead%40kestrelpay.io",
      method: "PATCH",
      idempotencyKey: null,
      body: { properties: { team_size: "2-10", worry: "Claude Code on staging" } },
    });
    expect(resend.calls[1]?.idempotencyKey).toBe("tydbase-waitlist-details-lead@kestrelpay.io");
    expect(JSON.stringify(resend.calls[1]?.body)).toContain("Claude Code on staging");
    expect(resend.calls[1]?.body).toMatchObject({ reply_to: "lead@kestrelpay.io" });
  });

  test("step 2 validation: unknown team size and an over-long worry are 400s", async () => {
    delete process.env.RESEND_API_KEY;
    const badSize = await POST(request({ email: "a@example.dev", teamSize: "huge" }));
    expect(badSize.status).toBe(400);
    const longWorry = await POST(request({ email: "a@example.dev", worry: "x".repeat(1001) }));
    expect(longWorry.status).toBe(400);
    expect(await longWorry.json()).toMatchObject({ message: "Keep it under 1,000 characters." });
  });

  test("Resend 409 duplicate: 200 alreadyJoined, no emails", async () => {
    useResend();
    const resend = mockResend(409, { name: "validation_error", message: "Contact already exists" });
    const res = await POST(request({ email: "repeat@kestrelpay.io" }));
    resend.restore();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, alreadyJoined: true });
    expect(resend.calls.map((c) => c.url)).toEqual(["https://api.resend.com/contacts"]);
  });

  test("sending-only key: 500 for the visitor, actionable log for us", async () => {
    useResend();
    const resend = mockResend(401, {
      statusCode: 401,
      name: "restricted_api_key",
      message: "This API key is restricted to only send emails",
    });
    const errorLog = spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(request({ email: "x@example.dev" }));
    const logged = errorLog.mock.calls.flat().join(" ");
    errorLog.mockRestore();
    resend.restore();

    expect(res.status).toBe(500);
    expect(logged).toContain("restricted_api_key");
    expect(logged).toContain("Full access");
  });

  test("no RESEND_FROM_EMAIL: contact saved, no email sent, one warning", async () => {
    useResend({ RESEND_NOTIFY_EMAIL: "team@example.dev" });
    delete process.env.RESEND_FROM_EMAIL;
    const resend = mockResend();
    const warn = spyOn(console, "warn").mockImplementation(() => {});
    const res = await POST(request({ email: "quiet@example.dev" }));
    await POST(request({ email: "quiet2@example.dev" }));
    const warnings = warn.mock.calls.length;
    const logged = warn.mock.calls.flat().join(" ");
    warn.mockRestore();
    resend.restore();

    expect(res.status).toBe(201);
    expect(resend.calls.every((c) => c.url.endsWith("/contacts"))).toBe(true);
    expect(warnings).toBe(1);
    expect(logged).toContain("RESEND_FROM_EMAIL is empty");
  });

  test("rate limit keys on x-real-ip: a rotating X-Forwarded-For cannot bypass it", async () => {
    delete process.env.RESEND_API_KEY;
    const statuses: number[] = [];
    for (let i = 0; i < 11; i += 1) {
      const res = await POST(
        new Request("http://localhost:3000/api/waitlist", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-real-ip": "203.0.113.50",
            "x-forwarded-for": `10.0.0.${i}`,
          },
          body: JSON.stringify({ email: "bad" }),
        })
      );
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 400)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});
