"use client";

import {
  AGENT_WRITE_SQL,
  type CaughtWriteStatus,
  DEMO_AGENT,
  DEMO_APPROVER,
  type DiffRow,
  useCaughtWrite,
} from "@tydbase/wasm-playground";
import { useEffect } from "react";
import { track } from "@/lib/analytics";

// The seeded target rows and what the dry run turns them into. Shown before the first run, and as a
// saved run when this browser can't start PGlite.
const STATIC_DIFF: DiffRow[] = [
  {
    id: 1041,
    email: "b***@studio.example.com",
    total: "240.00",
    before: "paid",
    after: "refunded",
  },
  { id: 1042, email: "b***@studio.example.com", total: "80.00", before: "paid", after: "refunded" },
  {
    id: 1043,
    email: "b***@studio.example.com",
    total: "310.00",
    before: "paid",
    after: "refunded",
  },
];

const STATUS_LABEL: Record<CaughtWriteStatus, string> = {
  booting: "Starting Postgres in your browser…",
  ready: "Starting the dry run…",
  running: "Running…",
  held: "Held for approval",
  approved: "Applied",
  rejected: "Rejected",
  drifted: "Stopped: a row changed",
  error: "Showing a saved run",
};

type TableMode = "current" | "diff" | "applied";

function DiffTable({ rows, mode }: { rows: DiffRow[]; mode: TableMode }) {
  return (
    <table className="w-full border-collapse text-left text-sm">
      <caption className="sr-only">
        {mode === "current" ? "Rows the agent's write targets" : "Rows the agent's write changes"}
      </caption>
      <thead>
        <tr className="border-b border-line text-ink-muted">
          <th scope="col" className="py-2 pr-4 font-normal">
            Order
          </th>
          <th scope="col" className="py-2 pr-4 font-normal">
            Customer (masked)
          </th>
          <th scope="col" className="hidden py-2 pr-4 text-right font-normal sm:table-cell">
            Total
          </th>
          <th scope="col" className="py-2 font-normal">
            Status
          </th>
        </tr>
      </thead>
      <tbody className="tyd-tabular text-sm">
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-line last:border-b-0">
            <td className="py-2 pr-4 font-mono text-[0.8125rem] text-ink">{row.id}</td>
            <td className="py-2 pr-4 font-mono text-[0.8125rem] text-ink-secondary">{row.email}</td>
            <td className="hidden py-2 pr-4 text-right font-mono text-[0.8125rem] text-ink-secondary sm:table-cell">
              {row.total}
            </td>
            <td className="py-2 whitespace-nowrap">
              {mode !== "diff" ? (
                <span className="text-ink">{mode === "applied" ? row.after : row.before}</span>
              ) : (
                <>
                  <span className="text-ink-muted line-through">{row.before}</span>
                  <span className="text-ink-muted" aria-hidden="true">
                    {" → "}
                  </span>
                  <span className="sr-only"> becomes </span>
                  <span className="text-warn">{row.after}</span>
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function CaughtWrite() {
  const { status, diff, audit, run, approve, reject, reset } = useCaughtWrite();
  const offline = status === "error";
  const isOutcome = status === "approved" || status === "rejected" || status === "drifted";
  const shownDiff = diff.length > 0 ? diff : STATIC_DIFF;
  const mode: TableMode =
    status === "approved"
      ? "applied"
      : status === "rejected" || status === "drifted"
        ? "current"
        : "diff";

  // The dry run starts as soon as Postgres is up, so the first thing a visitor sees is the held write.
  useEffect(() => {
    if (status === "ready") void run();
  }, [status, run]);

  return (
    <figure className="m-0 flex flex-col gap-3">
      <div className="tyd-panel flex flex-col" data-slot="caught-write" data-kind="product">
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3 text-sm">
          <span className="text-ink-secondary">
            <span className="text-ink">{DEMO_AGENT}</span> proposes a write on staging
          </span>
          <span
            role="status"
            aria-live="polite"
            className={status === "held" ? "text-warn" : "text-ink-muted"}
          >
            {STATUS_LABEL[status]}
          </span>
        </div>

        <pre className="tyd-code bg-surface-well px-5 py-4">
          <code>{AGENT_WRITE_SQL}</code>
        </pre>

        <div className="overflow-x-auto px-5 pt-2 pb-1">
          <DiffTable rows={shownDiff} mode={mode} />
        </div>

        {!isOutcome && (
          <div className="flex flex-col gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink">
              {offline
                ? "This browser couldn't start Postgres, so this is a saved run."
                : `Dry run: ${shownDiff.length} rows would change. Nothing is written until a teammate approves.`}
            </p>
            {!offline && (
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  className="tyd-btn-secondary"
                  disabled={status !== "held"}
                  onClick={() => {
                    track("demo_approved");
                    void approve();
                  }}
                >
                  Approve as {DEMO_APPROVER}
                </button>
                <button
                  type="button"
                  className="tyd-btn-text"
                  disabled={status !== "held"}
                  onClick={() => {
                    track("demo_rejected");
                    void reject();
                  }}
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        )}

        {isOutcome && (
          <div className="flex flex-col gap-3 border-t border-line px-5 py-4">
            <p className="text-sm text-ink">
              {status === "approved" &&
                `Applied after ${DEMO_APPROVER} approved it. The rows were unchanged since the diff.`}
              {status === "rejected" && `${DEMO_APPROVER} rejected it. The table is unchanged.`}
              {status === "drifted" &&
                "A row changed after the diff was shown, so the write was stopped."}
            </p>
            {audit && (
              <dl className="tyd-tabular grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-ink-secondary sm:grid-cols-4">
                <div>
                  <dt className="text-ink-muted">Time</dt>
                  <dd>{audit.at}</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Agent</dt>
                  <dd className="font-mono text-xs">{audit.agent}</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Outcome</dt>
                  <dd>
                    {audit.outcome === "applied"
                      ? `applied, ${audit.rows} rows`
                      : "rejected, nothing written"}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Audit hash</dt>
                  <dd className="font-mono text-xs">{audit.hash.slice(0, 12)}</dd>
                </div>
              </dl>
            )}
            <button
              type="button"
              className="tyd-btn-text self-start whitespace-nowrap"
              onClick={() => void reset()}
            >
              Run it again
            </button>
          </div>
        )}
      </div>
      <figcaption className="text-sm text-ink-muted">
        A real Postgres (PGlite) runs in this page. Sample data; emails are masked.
      </figcaption>
    </figure>
  );
}
