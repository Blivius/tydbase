import { describe, expect, test } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { AGENT_WRITE_SQL, SEED_SQL, TARGET_ROWS_SQL } from "./seed";
import { maskEmail } from "./use-caught-write";

describe("caught-write demo data", () => {
  test("the agent's write targets exactly three paid orders, and a rollback leaves them paid", async () => {
    const db = await PGlite.create();
    await db.exec(SEED_SQL);

    const before = await db.query<{ id: number; status: string; xmin: string }>(TARGET_ROWS_SQL);
    expect(before.rows.map((r) => r.id)).toEqual([1041, 1042, 1043]);
    expect(before.rows.every((r) => r.status === "paid" && r.xmin.length > 0)).toBe(true);

    await db.exec("BEGIN");
    const dry = await db.query<{ status: string }>(`${AGENT_WRITE_SQL} RETURNING status`);
    await db.exec("ROLLBACK");
    expect(dry.rows).toEqual([
      { status: "refunded" },
      { status: "refunded" },
      { status: "refunded" },
    ]);
    expect((await db.query(TARGET_ROWS_SQL)).rows).toHaveLength(3);

    const applied = await db.query(AGENT_WRITE_SQL);
    expect(applied.affectedRows).toBe(3);
    expect((await db.query(TARGET_ROWS_SQL)).rows).toHaveLength(0);
    await db.close();
  });

  test("masks the local part of an email", () => {
    expect(maskEmail("billing@studio.example.com")).toBe("b***@studio.example.com");
    expect(maskEmail("not-an-email")).toBe("***");
  });
});
