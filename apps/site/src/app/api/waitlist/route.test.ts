import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { POST } from "./route";

const localStoreFile = path.join(process.cwd(), ".waitlist-dev.json");
const originalLoopsKey = process.env.LOOPS_API_KEY;
const originalFetch = globalThis.fetch;

afterEach(() => {
  if (existsSync(localStoreFile)) {
    rmSync(localStoreFile, { force: true });
  }
  if (originalLoopsKey === undefined) {
    delete process.env.LOOPS_API_KEY;
  } else {
    process.env.LOOPS_API_KEY = originalLoopsKey;
  }
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
    delete process.env.LOOPS_API_KEY;
    const res = await POST(makeJsonRequest({ email: "not-an-email" }, "198.51.100.11"));
    expect(res.status).toBe(400);
    const data = (await res.json()) as { ok: boolean };
    expect(data.ok).toBe(false);
  });

  test("creates new entry (201) and updates duplicate entry (200) in local dev fallback", async () => {
    delete process.env.LOOPS_API_KEY;

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

  test("uses Loops.so create and falls back to update on 409 conflict", async () => {
    process.env.LOOPS_API_KEY = "test_loops_secret_key";
    const calls: Array<{ url: string; method: string }> = [];

    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method ?? "GET";
      calls.push({ url, method });

      if (url.endsWith("/contacts/create")) {
        return new Response(JSON.stringify({ message: "Email already in audience" }), {
          status: 409,
        });
      }
      return new Response(JSON.stringify({ success: true, id: "cnt_123" }), { status: 200 });
    }) as typeof fetch;

    const res = await POST(
      makeJsonRequest(
        { email: "team@kestrelpay.io", databases: ["PostgreSQL"], aiTools: ["Gemini CLI"] },
        "198.51.100.14"
      )
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; provider: string; alreadyJoined: boolean };
    expect(json.ok).toBe(true);
    expect(json.provider).toBe("loops");
    expect(json.alreadyJoined).toBe(true);
    expect(calls).toEqual([
      { url: "https://app.loops.so/api/v1/contacts/create", method: "POST" },
      { url: "https://app.loops.so/api/v1/contacts/update", method: "PUT" },
    ]);
  });
});
