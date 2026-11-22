import { CheckCircle2, Lock, Server, ShieldAlert } from "lucide-react";

const TODAY_ITEMS = [
  {
    title: "Four desktop apps per laptop",
    detail:
      "Install DataGrip for SQL, Compass for MongoDB, a separate Redis GUI, and Python scripts for vector indexes.",
  },
  {
    title: "Passwords living in Slack and .env files",
    detail:
      "Every new engineer receives raw staging and production credentials copied across chat threads.",
  },
  {
    title: "Unchecked local MCP connections",
    detail:
      "AI coding agents run local mcp.json servers with raw credentials, zero PII redaction, and no write approvals.",
  },
];

const TYDBASE_ITEMS = [
  {
    title: "One browser tab for four data models",
    detail:
      "Inspect SQL tables, MongoDB documents, Redis keys, and pgvector embeddings from one fast workspace.",
  },
  {
    title: "Outbound Go relay for VPC and localhost",
    detail:
      "Run one binary inside your private network or laptop. It dials out over WSS/mTLS with zero open firewall ports.",
  },
  {
    title: "One OAuth MCP URL for every AI tool",
    detail:
      "Connect Claude, OpenAI Codex, Gemini CLI, and Cursor once. Reads mask PII via WASM; production writes wait for approval.",
  },
];

export function ProblemStorySection() {
  return (
    <section
      id="problem"
      className="border-b border-line bg-surface-well"
      style={{ paddingBlock: "var(--space-12)" }}
    >
      <div className="tyd-container flex flex-col gap-10">
        <div className="max-w-[62ch]">
          <h2 className="tyd-section-head font-semibold text-ink">
            Database access broke twice: once for teams, then again for AI agents.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-secondary">
            Local GUI clients were built for one developer querying one Postgres server. Modern
            teams juggle four database engines across private VPCs while AI assistants ask for live
            schema access every hour.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="border-t-2 border-danger pt-6">
            <div className="mb-6 flex items-center gap-2.5 text-danger">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
              <h3 className="tyd-title font-semibold text-ink">How teams work today</h3>
            </div>
            <ul className="divide-y divide-line">
              {TODAY_ITEMS.map((item) => (
                <li key={item.title} className="py-5 first:pt-0 last:pb-0">
                  <p className="font-medium text-ink">{item.title}</p>
                  <p className="mt-1.5 max-w-[58ch] text-[0.9375rem] leading-relaxed text-ink-secondary">
                    {item.detail}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t-2 border-accent pt-6">
            <div className="mb-6 flex items-center gap-2.5 text-accent">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              <h3 className="tyd-title font-semibold text-ink">How TydBase handles it</h3>
            </div>
            <ul className="divide-y divide-line">
              {TYDBASE_ITEMS.map((item) => (
                <li key={item.title} className="py-5 first:pt-0 last:pb-0">
                  <p className="font-medium text-ink">{item.title}</p>
                  <p className="mt-1.5 max-w-[58ch] text-[0.9375rem] leading-relaxed text-ink-secondary">
                    {item.detail}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 border-t border-line pt-8 md:grid-cols-2">
          <div className="flex items-start gap-3">
            <Lock className="mt-1 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
            <p className="max-w-[52ch] text-[0.9375rem] leading-relaxed text-ink-secondary">
              Envelope encryption (AES-256-GCM) keeps workspace credentials locked down, with an
              optional ephemeral mode that never saves passwords at all.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Server className="mt-1 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
            <p className="max-w-[52ch] text-[0.9375rem] leading-relaxed text-ink-secondary">
              Every human query and MCP tool call lands in one searchable audit trail tagged by
              workspace, user, client, and environment.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
