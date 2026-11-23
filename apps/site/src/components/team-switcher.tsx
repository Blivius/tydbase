"use client";

import { type KeyboardEvent, useRef, useState } from "react";

// Planned interface (P1 · M4 to M6), shown with sample data.
const PANELS = [
  {
    id: "agent",
    tab: "The agent",
    line: "Claude Code, Codex or Cursor calls the CLI through a skill. The laptop holds a token, never the password.",
    body: `$ tydbase propose --conn staging \\
    "UPDATE orders SET status = 'refunded'
     WHERE customer_id = 7 AND status = 'paid'"

dry run on staging: 3 rows in orders would change
  order   total    status
  1041    240.00   paid → refunded
  1042     80.00   paid → refunded
  1043    310.00   paid → refunded

held as req_7q2 for ana/claude-code
it runs when a teammate approves`,
  },
  {
    id: "teammate",
    tab: "The teammate",
    line: "The request lands in Slack or Microsoft Teams. Someone other than the requester approves it.",
    body: `#db-approvals

TydBase
ana/claude-code wants to change 3 rows in orders (staging)

  1041   paid → refunded
  1042   paid → refunded
  1043   paid → refunded

approve:  tydbase approve req_7q2
reject:   tydbase reject req_7q2`,
  },
  {
    id: "admin",
    tab: "The admin",
    line: "One server holds the password and the rules. The terminal UI shows every query with its person and agent.",
    body: `staging                                   policy
reads    orders, customers    masked  customers.email
writes   orders               needs   1 teammate
limits   10 s per query       caps    1,000 rows

audit
14:02  ana/claude-code  UPDATE orders     held     3 rows
14:05  ravi             approve req_7q2   applied  3 rows
14:09  sam/codex        SELECT customers  ok      12 rows`,
  },
] as const;

export function TeamSwitcher() {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (active + step + PANELS.length) % PANELS.length;
    setActive(next);
    tabs.current[next]?.focus();
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Who sees what"
        onKeyDown={onKeyDown}
        className="flex overflow-x-auto overflow-y-hidden border-b border-line"
      >
        {PANELS.map((panel, i) => (
          <button
            key={panel.id}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${panel.id}`}
            aria-selected={active === i}
            aria-controls={`panel-${panel.id}`}
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
            className={`-mb-px min-h-11 border-b-2 px-4 text-sm whitespace-nowrap transition-colors ${
              active === i
                ? "border-accent text-ink"
                : "border-transparent text-ink-secondary hover:text-ink"
            }`}
          >
            {panel.tab}
          </button>
        ))}
      </div>
      {PANELS.map((panel, i) => (
        <div
          key={panel.id}
          role="tabpanel"
          id={`panel-${panel.id}`}
          aria-labelledby={`tab-${panel.id}`}
          hidden={active !== i}
          className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-12"
        >
          <p className="tyd-lead">{panel.line}</p>
          <pre className="tyd-code tyd-panel bg-surface-well p-6" tabIndex={0}>
            <code>{panel.body}</code>
          </pre>
        </div>
      ))}
    </div>
  );
}
