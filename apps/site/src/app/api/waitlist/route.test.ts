import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { POST } from "./route";

const localStoreFile = path.join(process.cwd(), ".waitlist-dev.json");
const savedEnv = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_AUDIENCE_ID: process.env.RESEND_AUDIENCE_ID,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  RESEND_NOTIFY_EMAIL: process.env.RESEND_NOTIFY_EMAIL,
};
const originalFetch = globalThis.fetch;

function restoreEnvKey(key: keyof typeof savedEnv) {
  const val = savedEnv[key];
  if (val === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = val;
  }
}

afterEach(() => {
  if (existsSync(localStoreFile)) {
    rmSync(localStoreFile, { force: true });
  }
  restoreEnvKey("RESEND_API_KEY");
  restoreEnvKey("RESEND_AUDIENCE_ID");
  restoreEnvKey("RESEND_FROM_EMAIL");
  restoreEnvKey("RESEND_NOTIFY_EMAIL");
  globalThis.fetch = originalFetch;
});

function makeJsonRequest(body: unknown, ip = "198.51.100.1"): Request {
  return new Request("http://localhost:3000/api/waitlist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/waitlist", () => {
  test("rejects malformed email with 400", async () => {
    delete process.env.RESEND_API_KEY;
    const res = await POST(makeJsonRequest({ email: "not-an-email" }, "198.51.100.11"));
    expect(res.status).toBe(400);
    const data = (await res.json()) as { ok: boolean };
    expect(data.ok).toBe(false);
  });

  test("creates new entry (201) and updates duplicate entry (200) in local dev fallback", async () => {
    delete process.env.RESEND_API_KEY;

    const first = await POST(
      makeJsonRequest(
        {
          email: "lead@northstar.dev",
          role: "Backend Lead",
          databases: ["PostgreSQL", "Redis / Valkey"],
          aiTools: ["Claude Code / Desktop"],
        },
        "198.51.100.12"
      )
    );
    expect(first.status).toBe(201);
    const firstJson = (await first.json()) as {
      ok: boolean;
      alreadyJoined: boolean;
      provider: string;
    };
    expect(firstJson.ok).toBe(true);
    expect(firstJson.alreadyJoined).toBe(false);
    expect(firstJson.provider).toBe("local-dev");

    const duplicate = await POST(
      makeJsonRequest({ email: "LEAD@northstar.dev", role: "Staff Engineer" }, "198.51.100.13")
    );
    expect(duplicate.status).toBe(200);
    const dupJson = (await duplicate.json()) as { ok: boolean; alreadyJoined: boolean };
    expect(dupJson.ok).toBe(true);
    expect(dupJson.alreadyJoined).toBe(true);
  });

  test("adds contact to Resend audience and sends idempotent confirmation email", async () => {
    process.env.RESEND_API_KEY = "re_test_secret_key";
    process.env.RESEND_AUDIENCE_ID = "aud_tydbase_beta";
    process.env.RESEND_FROM_EMAIL = "TydBase <beta@blivius.com>";
    delete process.env.RESEND_NOTIFY_EMAIL;

    const calls: Array<{ url: string; method: string; idempotencyKey: string | null }> = [];

    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : input.toString();
      const method = init?.method ?? "GET";
      const headers = new Headers(init?.headers);
      calls.push({ url, method, idempotencyKey: headers.get("Idempotency-Key") });

      if (url.includes("/contacts")) {
        return new Response(JSON.stringify({ object: "contact", id: "cnt_999" }), { status: 201 });
      }
      return new Response(JSON.stringify({ id: "email_999" }), { status: 200 });
    }) as typeof fetch;

    const res = await POST(
      makeJsonRequest(
        { email: "team@kestrelpay.io", databases: ["PostgreSQL"], aiTools: ["Gemini CLI"] },
        "198.51.100.14"
      )
    );

    expect(res.status).toBe(201);
    const json = (await res.json()) as { ok: boolean; provider: string; alreadyJoined: boolean };
    expect(json.ok).toBe(true);
    expect(json.provider).toBe("resend");
    expect(json.alreadyJoined).toBe(false);
    expect(calls).toEqual([
      {
        url: "https://api.resend.com/audiences/aud_tydbase_beta/contacts",
        method: "POST",
        idempotencyKey: null,
      },
      {
        url: "https://api.resend.com/emails",
        method: "POST",
        idempotencyKey: "tydbase-waitlist-team@kestrelpay.io",
      },
    ]);
  });

  test("handles Resend 409 duplicate contact gracefully without resending email", async () => {
    process.env.RESEND_API_KEY = "re_test_secret_key";
    delete process.env.RESEND_AUDIENCE_ID;
    process.env.RESEND_FROM_EMAIL = "TydBase <beta@blivius.com>";

    const calls: string[] = [];
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = input instanceof Request ? input.url : input.toString();
      calls.push(url);
      return new Response(JSON.stringify({ message: "Contact already exists" }), { status: 409 });
    }) as typeof fetch;

    const res = await POST(makeJsonRequest({ email: "repeat@kestrelpay.io" }, "198.51.100.15"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; alreadyJoined: boolean; provider: string };
    expect(json.ok).toBe(true);
    expect(json.alreadyJoined).toBe(true);
    expect(json.provider).toBe("resend");
    expect(calls).toEqual(["https://api.resend.com/contacts"]);
  });
});
