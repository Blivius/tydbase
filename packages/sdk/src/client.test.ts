import { describe, expect, test } from "bun:test";
import { createTydBaseClient } from "./index";

async function mockHealthFetch(input: Request): Promise<Response> {
  expect(input.url).toBe("http://api.tydbase.local/api/v1/health");
  return new Response(
    JSON.stringify({
      status: "ok",
      service: "tydbase-api",
      version: "0.1.0",
      env: "test",
      goVersion: "go1.27.4",
      paradigms: ["sql", "document", "kv", "vector"],
      timestamp: "2026-11-22T14:00:00Z",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

async function mockEngineFetch(input: Request): Promise<Response> {
  expect(input.url).toBe("http://api.tydbase.local/api/v1/engines/postgres");
  return new Response(
    JSON.stringify({
      id: "postgres",
      name: "PostgreSQL (+ pgvector)",
      paradigm: "sql",
      defaultPort: 5432,
      supportsRelay: true,
      supportsReadTx: true,
      supportsVector: true,
      status: "tier1",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

describe("@tydbase/sdk client", () => {
  test("calls typed /api/v1/health endpoint", async () => {
    const client = createTydBaseClient({
      baseUrl: "http://api.tydbase.local",
      fetch: mockHealthFetch,
    });

    const { data, error } = await client.GET("/api/v1/health");
    expect(error).toBeUndefined();
    expect(data?.status).toBe("ok");
    expect(data?.paradigms).toEqual(["sql", "document", "kv", "vector"]);
  });

  test("calls typed /api/v1/engines/{id} endpoint", async () => {
    const client = createTydBaseClient({
      baseUrl: "http://api.tydbase.local",
      fetch: mockEngineFetch,
    });

    const { data, error } = await client.GET("/api/v1/engines/{id}", {
      params: { path: { id: "postgres" } },
    });
    expect(error).toBeUndefined();
    expect(data?.id).toBe("postgres");
    expect(data?.supportsVector).toBe(true);
  });
});
