"use client";

import type { PGlite } from "@electric-sql/pglite";
import { useCallback, useEffect, useRef, useState } from "react";
import { SEED_SQL, SQL_PRESETS } from "./seed";

export interface PlaygroundResult {
  columns: string[];
  rows: Record<string, unknown>[];
  affectedRows: number | null;
  durationMs: number;
  executedAt: string;
}

export type PlaygroundStatus = "booting" | "ready" | "running" | "error";

async function createSeededDatabase(): Promise<PGlite> {
  // Loaded on demand: the WASM bundle only downloads when the playground mounts.
  const { PGlite } = await import("@electric-sql/pglite");
  const db = await PGlite.create();
  await db.exec(SEED_SQL);
  return db;
}

export function usePglitePlayground() {
  const dbRef = useRef<PGlite | null>(null);
  const [status, setStatus] = useState<PlaygroundStatus>("booting");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlaygroundResult | null>(null);

  useEffect(() => {
    let isCancelled = false;

    createSeededDatabase()
      .then(async (db) => {
        if (isCancelled) {
          await db.close().catch(() => {});
          return;
        }
        if (dbRef.current) {
          await dbRef.current.close().catch(() => {});
        }
        dbRef.current = db;
        setResult(null);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (isCancelled) return;
        setError(err instanceof Error ? err.message : "Failed to boot in-browser PostgreSQL.");
        setStatus("error");
      });

    return () => {
      isCancelled = true;
      if (dbRef.current) {
        const prev = dbRef.current;
        dbRef.current = null;
        void prev.close().catch(() => {});
      }
    };
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const resetDb = useCallback(async () => {
    setStatus("booting");
    setError(null);
    setResult(null);
    try {
      const db = await createSeededDatabase();
      if (dbRef.current) {
        await dbRef.current.close().catch(() => {});
      }
      dbRef.current = db;
      setResult(null);
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset in-browser PostgreSQL.");
      setStatus("error");
    }
  }, []);

  const runQuery = useCallback(async (sql: string) => {
    const db = dbRef.current;
    if (!db) return;
    const trimmed = sql.trim();
    if (!trimmed) {
      setError("Enter a SQL statement before running.");
      return;
    }

    setStatus("running");
    setError(null);
    const started = performance.now();
    try {
      const res = await db.query<Record<string, unknown>>(trimmed);
      const durationMs = Math.max(0.2, Number((performance.now() - started).toFixed(1)));
      setResult({
        columns: res.fields.map((f) => f.name),
        rows: res.rows,
        affectedRows: res.affectedRows ?? null,
        durationMs,
        executedAt: new Date().toLocaleTimeString(),
      });
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query execution failed.");
      setStatus("ready");
    }
  }, []);

  return {
    status,
    error,
    result,
    presets: SQL_PRESETS,
    runQuery,
    clearResult,
    resetDb,
  };
}
