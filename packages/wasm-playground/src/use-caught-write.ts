"use client";

import type { PGlite } from "@electric-sql/pglite";
import { useCallback, useEffect, useRef, useState } from "react";
import { AGENT_WRITE_SQL, SEED_SQL, TARGET_ROWS_SQL } from "./seed";

export type CaughtWriteStatus =
  | "booting"
  | "ready"
  | "running"
  | "held"
  | "approved"
  | "rejected"
  | "drifted"
  | "error";

export interface DiffRow {
  id: number;
  email: string;
  total: string;
  before: string;
  after: string;
}

export interface AuditEntry {
  at: string;
  agent: string;
  approver: string;
  rows: number;
  table: string;
  outcome: "applied" | "rejected";
  hash: string;
}

interface TargetRow {
  id: number;
  email: string;
  total: string;
  status: string;
  xmin: string;
}

export const DEMO_AGENT = "ana/claude-code";
export const DEMO_APPROVER = "ravi";

/** Masks the local part of an email the way TydBase's masking policy would: o***@bakery.example.com. */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at < 1) return "***";
  return `${email[0]}***${email.slice(at)}`;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function seededDatabase(): Promise<PGlite> {
  // Loaded on demand: the WASM bundle only downloads when the demo mounts.
  const { PGlite } = await import("@electric-sql/pglite");
  const db = await PGlite.create();
  await db.exec(SEED_SQL);
  return db;
}

/**
 * Runs the site's caught-write demo against a real Postgres in the browser: the agent's UPDATE
 * runs inside a transaction that is rolled back (the dry run), and only an approval applies it,
 * after checking that no target row changed since the diff was shown (xmin).
 */
export function useCaughtWrite() {
  const dbRef = useRef<PGlite | null>(null);
  const heldRef = useRef<TargetRow[]>([]);
  const chainRef = useRef("0".repeat(64));
  const [status, setStatus] = useState<CaughtWriteStatus>("booting");
  const [diff, setDiff] = useState<DiffRow[]>([]);
  const [audit, setAudit] = useState<AuditEntry | null>(null);

  useEffect(() => {
    let cancelled = false;
    seededDatabase()
      .then(async (db) => {
        if (cancelled) return db.close();
        dbRef.current = db;
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
      void dbRef.current?.close().catch(() => {});
      dbRef.current = null;
    };
  }, []);

  const record = useCallback(async (outcome: AuditEntry["outcome"], rows: number) => {
    const entry = {
      at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      agent: DEMO_AGENT,
      approver: DEMO_APPROVER,
      rows,
      table: "orders",
      outcome,
    };
    // Each entry hashes the previous one, so editing any past line breaks every hash after it.
    const hash = await sha256Hex(chainRef.current + JSON.stringify(entry));
    chainRef.current = hash;
    setAudit({ ...entry, hash });
  }, []);

  const run = useCallback(async () => {
    const db = dbRef.current;
    if (!db) return;
    setStatus("running");
    setAudit(null);
    try {
      await db.exec("BEGIN");
      const before = await db.query<TargetRow>(TARGET_ROWS_SQL);
      const after = await db.query<{ id: number; status: string }>(
        `${AGENT_WRITE_SQL} RETURNING id, status`
      );
      await db.exec("ROLLBACK");
      const afterById = new Map(after.rows.map((r) => [r.id, r.status]));
      heldRef.current = before.rows;
      setDiff(
        before.rows.map((r) => ({
          id: r.id,
          email: maskEmail(r.email),
          total: r.total,
          before: r.status,
          after: afterById.get(r.id) ?? r.status,
        }))
      );
      setStatus("held");
    } catch {
      await db.exec("ROLLBACK").catch(() => {});
      setStatus("error");
    }
  }, []);

  const approve = useCallback(async () => {
    const db = dbRef.current;
    if (!db) return;
    setStatus("running");
    try {
      await db.exec("BEGIN");
      const now = await db.query<TargetRow>(TARGET_ROWS_SQL);
      const held = new Map(heldRef.current.map((r) => [r.id, r.xmin]));
      const drifted =
        now.rows.length !== held.size || now.rows.some((r) => held.get(r.id) !== r.xmin);
      if (drifted) {
        await db.exec("ROLLBACK");
        setStatus("drifted");
        return;
      }
      const res = await db.query(AGENT_WRITE_SQL);
      await db.exec("COMMIT");
      await record("applied", res.affectedRows ?? 0);
      setStatus("approved");
    } catch {
      await db.exec("ROLLBACK").catch(() => {});
      setStatus("error");
    }
  }, [record]);

  const reject = useCallback(async () => {
    await record("rejected", 0);
    setStatus("rejected");
  }, [record]);

  const reset = useCallback(async () => {
    const db = dbRef.current;
    if (!db) return;
    setStatus("running");
    try {
      await db.exec(`DROP TABLE IF EXISTS orders; DROP TABLE IF EXISTS customers; ${SEED_SQL}`);
      setDiff([]);
      setAudit(null);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  return { status, diff, audit, run, approve, reject, reset };
}
