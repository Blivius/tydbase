import { describe, expect, test } from "bun:test";
import { SEED_SQL, SQL_PRESETS } from "./seed";

describe("wasm-playground seed and presets", () => {
  test("defines non-empty seed schema with all four core tables", () => {
    expect(SEED_SQL).toContain("CREATE TABLE IF NOT EXISTS workspaces");
    expect(SEED_SQL).toContain("CREATE TABLE IF NOT EXISTS members");
    expect(SEED_SQL).toContain("CREATE TABLE IF NOT EXISTS saved_queries");
    expect(SEED_SQL).toContain("CREATE TABLE IF NOT EXISTS ai_documents");
  });

  test("exports four unique SQL presets with valid SELECT statements", () => {
    expect(SQL_PRESETS.length).toBe(4);
    const ids = new Set(SQL_PRESETS.map((p) => p.id));
    expect(ids.size).toBe(SQL_PRESETS.length);
    for (const preset of SQL_PRESETS) {
      expect(preset.sql.trim().toUpperCase().startsWith("SELECT")).toBe(true);
    }
  });
});
