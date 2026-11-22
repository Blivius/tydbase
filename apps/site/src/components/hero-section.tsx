"use client";

import { Check, Database, Play, ShieldAlert, ShieldCheck, Terminal } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";

type EnginePreviewKey = "postgres" | "mongodb" | "redis";

interface EnginePreview {
  id: EnginePreviewKey;
  label: string;
  env: string;
  query: string;
  columns: string[];
  rows: string[][];
}

const ENGINE_PREVIEWS: Record<EnginePreviewKey, EnginePreview> = {
  postgres: {
    id: "postgres",
    label: "PostgreSQL + pgvector",
    env: "production",
    query: `SELECT id, email, cosine_distance(embedding, $1) AS dist
FROM support_tickets
ORDER BY dist ASC LIMIT 3;`,
    columns: ["id", "email (masked)", "dist"],
    rows: [
      ["tkt_9041", "r***@northstar.dev", "0.041"],
      ["tkt_9038", "s***@kestrelpay.io", "0.068"],
      ["tkt_9029", "t***@harborml.ai", "0.094"],
    ],
  },
  mongodb: {
    id: "mongodb",
    label: "MongoDB",
    env: "staging",
    query: `db.sessions.aggregate([
  { $match: { active: true } },
  { $project: { org: 1, region: 1, ttlSec: 1 } }
])`,
    columns: ["org", "region", "ttlSec"],
    rows: [
      ["northstar-labs", "us-east-1", "3420"],
      ["kestrel-pay", "eu-central-1", "1890"],
      ["harbor-ml", "ap-southeast-1", "2740"],
    ],
  },
  redis: {
    id: "redis",
    label: "Redis / Valkey",
    env: "localhost relay",
    query: `SCAN 0 MATCH "mcp:session:*" COUNT 20`,
    columns: ["key", "type", "ttl"],
    rows: [
      ["mcp:session:claude-8f1", "hash", "41m"],
      ["mcp:session:codex-3c9", "hash", "19m"],
      ["mcp:session:gemini-7a2", "hash", "52m"],
    ],
  },
};

export function HeroSection() {
  const [email, setEmail] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [feedback, setFeedback] = useState("");
  const [activeEngine, setActiveEngine] = useState<EnginePreviewKey>("postgres");
  const [approvalState, setApprovalState] = useState<"pending" | "approved" | "rejected">(
    "pending"
  );
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const keys: EnginePreviewKey[] = ["postgres", "mongodb", "redis"];
    const timer = window.setInterval(() => {
      setActiveEngine((prev) => {
        const nextIdx = (keys.indexOf(prev) + 1) % keys.length;
        return keys[nextIdx] ?? "postgres";
      });
    }, 5200);
    return () => window.clearInterval(timer);
  }, [isPaused]);

  const preview = ENGINE_PREVIEWS[activeEngine];

  async function handleQuickSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;
    setSubmitState("submitting");
    setFeedback("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "hero-form" }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setSubmitState("error");
        setFeedback(data.message ?? "Could not join right now.");
        return;
      }
      setSubmitState("done");
      setFeedback(data.message ?? "Added to the TydBase beta list.");
      setEmail("");
    } catch {
      setSubmitState("error");
      setFeedback("Network error while submitting. Try again.");
    }
  }

  return (
    <section
      className="relative flex min-h-[82dvh] items-center border-b border-line"
      style={{ paddingBlock: "var(--space-8)" }}
    >
      <div className="tyd-container grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="flex flex-col gap-6 lg:col-span-6">
          <h1 className="tyd-display font-semibold text-ink">One workspace for every database.</h1>

          <p className="max-w-[54ch] text-lg leading-relaxed text-ink-secondary">
            Query SQL, NoSQL, and vectors while governing Claude, Codex, and Gemini.
          </p>

          <form
            onSubmit={handleQuickSignup}
            className="flex w-full max-w-xl flex-col gap-3 sm:flex-row"
            noValidate
          >
            <label htmlFor="hero-waitlist-email" className="sr-only">
              Email address for TydBase beta waitlist
            </label>
            <input
              id="hero-waitlist-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              disabled={submitState === "submitting"}
              className="tyd-input flex-1"
            />
            <button
              type="submit"
              disabled={submitState === "submitting"}
              className="tyd-btn-primary shrink-0"
            >
              {submitState === "submitting" ? "Joining…" : "Join beta waitlist"}
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-4">
            <Link href="#playground" className="tyd-btn-secondary">
              <Play className="h-4 w-4 text-accent" aria-hidden="true" />
              Run live SQL in browser
            </Link>
            <Link
              href="/demo"
              className="whitespace-nowrap text-[0.9375rem] font-medium text-ink-secondary underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink"
            >
              Play 60-second teaser
            </Link>
          </div>

          <p
            role="status"
            aria-live="polite"
            className={`min-h-[1.5rem] text-sm ${
              submitState === "error"
                ? "text-danger"
                : submitState === "done"
                  ? "text-accent"
                  : "text-ink-muted"
            }`}
          >
            {feedback ||
              "Launching early beta at tydbase.blivius.com. Zero passwords stored on laptops."}
          </p>
        </div>

        <div
          className="tyd-panel overflow-hidden lg:col-span-6"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocusCapture={() => setIsPaused(true)}
          onBlurCapture={() => setIsPaused(false)}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-well px-4 py-3">
            <div
              className="flex flex-wrap items-center gap-1.5"
              role="tablist"
              aria-label="Engine preview"
            >
              {(Object.keys(ENGINE_PREVIEWS) as EnginePreviewKey[]).map((key) => {
                const item = ENGINE_PREVIEWS[key];
                const isSelected = activeEngine === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => {
                      setIsPaused(true);
                      setActiveEngine(key);
                    }}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                      isSelected
                        ? "bg-accent-tint text-accent"
                        : "text-ink-secondary hover:bg-surface-raised hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setIsPaused((prev) => !prev)}
              className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink-secondary transition-colors hover:border-line-strong hover:text-ink"
            >
              {isPaused ? "Resume cycle" : "Pause cycle"}
            </button>
          </div>

          <motion.div
            key={preview.id}
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="divide-y divide-line"
          >
            <div className="bg-surface-well/65 px-5 py-4">
              <div className="mb-2 flex items-center justify-between text-xs text-ink-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                  Environment: {preview.env}
                </span>
                <span>WASM PII mask active</span>
              </div>
              <pre className="overflow-x-auto font-mono text-[0.8125rem] leading-relaxed text-ink">
                <code>{preview.query}</code>
              </pre>
            </div>

            <div className="overflow-x-auto px-5 py-3.5">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-ink-muted">
                    {preview.columns.map((col) => (
                      <th key={col} className="pb-2 pr-4 font-medium">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60 font-mono text-[0.8125rem] text-ink-secondary">
                  {preview.rows.map((row) => (
                    <tr key={row[0]}>
                      {row.map((cell, idx) => (
                        <td
                          key={`${row[0]}-${idx}`}
                          className={`py-2 pr-4 tyd-tabular ${idx === 0 ? "text-ink" : ""}`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 bg-surface-raised/55 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-ink">
                  {approvalState === "approved" ? (
                    <ShieldCheck className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
                  )}
                  <span>
                    {approvalState === "pending" && "MCP write paused for approval"}
                    {approvalState === "approved" && "Write approved and logged to audit trail"}
                    {approvalState === "rejected" && "Write blocked before reaching production"}
                  </span>
                </div>
                <p className="mt-1 truncate font-mono text-xs text-ink-muted">
                  <Terminal className="mr-1.5 inline h-3 w-3" aria-hidden="true" />
                  claude-code: DELETE FROM sessions WHERE expired_at &lt; now();
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {approvalState === "pending" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setApprovalState("approved")}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md bg-accent px-3 text-xs font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setApprovalState("rejected")}
                      className="inline-flex h-9 items-center rounded-md border border-danger/50 bg-danger-tint px-3 text-xs font-medium text-danger transition-colors hover:border-danger"
                    >
                      Reject
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setApprovalState("pending")}
                    className="inline-flex h-9 items-center rounded-md border border-line-strong px-3 text-xs font-medium text-ink-secondary transition-colors hover:text-ink"
                  >
                    Reset gate
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
