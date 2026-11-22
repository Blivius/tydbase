"use client";

import { Cpu, GlobeLock, Layers, Terminal } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

const CLI_MODE_KEYS = ["start", "agent", "mcp"] as const;
type CliMode = (typeof CLI_MODE_KEYS)[number];

const CLI_MODES: Record<CliMode, { label: string; command: string; lines: string[] }> = {
  start: {
    label: "Local self-host",
    command: "tydbase start",
    lines: [
      "TydBase local engine ready (embedded SQLite metadata)",
      "Web workspace: http://localhost:4800",
      "MCP stdio & HTTP: enabled for local databases",
    ],
  },
  agent: {
    label: "Private VPC / localhost relay",
    command: "tydbase agent --token tb_agt_prod_us_east",
    lines: [
      "Outbound WSS/mTLS tunnel connected -> api.tydbase.com",
      "Zero inbound firewall ports required",
      "Bridging: postgres://10.0.4.12:5432, redis://10.0.4.18:6379",
    ],
  },
  mcp: {
    label: "Wire AI clients",
    command: "tydbase mcp install --client claude,codex,gemini,cursor",
    lines: [
      "Registered OAuth 2.1 endpoint: https://mcp.tydbase.com/v1",
      "Tools exposed: 6 (list_connections, search_schema, describe_object,",
      "  execute_read_query, explain_query, propose_mutation)",
    ],
  },
};

const PILLARS = [
  {
    icon: GlobeLock,
    title: "Outbound Go relay for private networks",
    body: "Connect to localhost Docker databases or private AWS and GCP VPCs without opening inbound firewall ports or maintaining SSH bastions.",
  },
  {
    icon: Cpu,
    title: "Sandboxed wazero WebAssembly plugins",
    body: "Run PII redaction, SQL safety linters, and custom community connectors inside a pure-Go WebAssembly runtime with strict memory and timeout limits.",
  },
  {
    icon: Layers,
    title: "Four native data paradigms in one Go core",
    body: "Native Go drivers for PostgreSQL (+ pgvector), MySQL, MariaDB, MSSQL, SQLite/LibSQL, MongoDB, and Redis, with Qdrant and vector stores built into the interface.",
  },
];

export function ArchitectureSection() {
  const [cliMode, setCliMode] = useState<CliMode>("agent");
  const current = CLI_MODES[cliMode];

  return (
    <section
      id="architecture"
      className="border-b border-line bg-surface-well"
      style={{ paddingBlock: "var(--space-12)" }}
    >
      <div className="tyd-container flex flex-col gap-10">
        <div className="max-w-[60ch]">
          <h2 className="tyd-section-head font-semibold text-ink">
            One Go binary for cloud, private VPCs, and your laptop.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-secondary">
            Zero JVM overhead, zero Auth0 or Firebase lock-in. The same Go engine powers the
            self-hosted server, the outbound VPC relay agent, and the governed MCP gateway.
          </p>
        </div>

        <div className="tyd-panel overflow-x-auto p-6">
          <svg
            viewBox="0 0 960 190"
            className="h-auto w-full min-w-[680px]"
            role="img"
            aria-label="TydBase network topology diagram showing outbound WSS/mTLS relay from private VPC and localhost to the Go Control Plane, Browser Workspace, and MCP AI clients"
          >
            {/* Private VPC & Localhost Node */}
            <rect
              x="16"
              y="26"
              width="250"
              height="138"
              rx="0"
              fill="var(--color-surface-well)"
              stroke="var(--color-border-strong)"
            />
            <text
              x="36"
              y="56"
              fill="var(--color-ink)"
              fontSize="14"
              fontWeight="600"
              fontFamily="var(--font-display)"
            >
              Private VPC / Localhost
            </text>
            <text
              x="36"
              y="82"
              fill="var(--color-ink-secondary)"
              fontSize="12"
              fontFamily="var(--font-mono)"
            >
              Postgres, Mongo, Redis, Vector
            </text>
            <text
              x="36"
              y="108"
              fill="var(--color-accent)"
              fontSize="12"
              fontFamily="var(--font-mono)"
            >
              tydbase agent (0 open ports)
            </text>
            <text
              x="36"
              y="138"
              fill="var(--color-ink-muted)"
              fontSize="12"
              fontFamily="var(--font-body)"
            >
              Dials outbound over WSS/mTLS
            </text>

            {/* Outbound animated packet line */}
            <line
              x1="266"
              y1="95"
              x2="366"
              y2="95"
              stroke="var(--color-border-strong)"
              strokeWidth="2"
            />
            <line
              x1="266"
              y1="95"
              x2="366"
              y2="95"
              stroke="var(--color-accent)"
              strokeWidth="2.5"
              className="tyd-packet-line"
            />
            <text
              x="316"
              y="78"
              textAnchor="middle"
              fill="var(--color-accent)"
              fontSize="11"
              fontFamily="var(--font-body)"
            >
              WSS / mTLS
            </text>

            {/* Control Plane Node */}
            <rect
              x="366"
              y="20"
              width="248"
              height="150"
              rx="0"
              fill="var(--color-surface-raised)"
              stroke="var(--color-accent)"
            />
            <text
              x="386"
              y="52"
              fill="var(--color-ink)"
              fontSize="15"
              fontWeight="600"
              fontFamily="var(--font-display)"
            >
              TydBase Go Control Plane
            </text>
            <text
              x="386"
              y="78"
              fill="var(--color-ink-secondary)"
              fontSize="12"
              fontFamily="var(--font-body)"
            >
              AES-256-GCM credential vault
            </text>
            <text
              x="386"
              y="102"
              fill="var(--color-ink-secondary)"
              fontSize="12"
              fontFamily="var(--font-body)"
            >
              wazero WASM PII mask &amp; linters
            </text>
            <text
              x="386"
              y="126"
              fill="var(--color-ink-secondary)"
              fontSize="12"
              fontFamily="var(--font-body)"
            >
              Write approvals &amp; audit trail
            </text>
            <text
              x="386"
              y="150"
              fill="var(--color-accent)"
              fontSize="12"
              fontFamily="var(--font-mono)"
            >
              REST + SSE + OAuth 2.1 MCP
            </text>

            {/* Outgoing lines to Workspace and AI Clients */}
            <path
              d="M 614 68 L 694 52"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="2"
              className="tyd-packet-line"
            />
            <path
              d="M 614 122 L 694 138"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="2"
              className="tyd-packet-line"
            />

            {/* Browser Workspace Node */}
            <rect
              x="694"
              y="20"
              width="250"
              height="64"
              rx="0"
              fill="var(--color-surface-well)"
              stroke="var(--color-border-strong)"
            />
            <text
              x="714"
              y="47"
              fill="var(--color-ink)"
              fontSize="14"
              fontWeight="600"
              fontFamily="var(--font-display)"
            >
              Browser Workspace
            </text>
            <text
              x="714"
              y="68"
              fill="var(--color-ink-secondary)"
              fontSize="12"
              fontFamily="var(--font-body)"
            >
              Zero-install team SQL, NoSQL &amp; vectors
            </text>

            {/* AI Clients Node */}
            <rect
              x="694"
              y="106"
              width="250"
              height="64"
              rx="0"
              fill="var(--color-surface-well)"
              stroke="var(--color-border-strong)"
            />
            <text
              x="714"
              y="133"
              fill="var(--color-ink)"
              fontSize="14"
              fontWeight="600"
              fontFamily="var(--font-display)"
            >
              AI Agents (OAuth MCP)
            </text>
            <text
              x="714"
              y="154"
              fill="var(--color-ink-secondary)"
              fontSize="12"
              fontFamily="var(--font-body)"
            >
              Claude, Codex, Gemini CLI, Cursor
            </text>
          </svg>
        </div>

        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
          <div className="divide-y divide-line lg:col-span-6">
            {PILLARS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="py-6 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                    <h3 className="tyd-title font-semibold text-ink">{item.title}</h3>
                  </div>
                  <p className="mt-2.5 max-w-[54ch] text-[0.9375rem] leading-relaxed text-ink-secondary">
                    {item.body}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="tyd-panel overflow-hidden lg:col-span-6">
            <div className="flex flex-wrap items-center gap-1.5 border-b border-line bg-surface-well px-4 py-3">
              {CLI_MODE_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCliMode(key)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                    cliMode === key
                      ? "bg-accent-tint text-accent"
                      : "text-ink-secondary hover:bg-surface-raised hover:text-ink"
                  }`}
                >
                  {CLI_MODES[key].label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={cliMode}
                initial={{ opacity: 0.35, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0.35, y: -4 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4 p-5 font-mono text-sm"
              >
                <div className="flex items-center gap-2 text-accent">
                  <Terminal className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>$ {current.command}</span>
                </div>
                <div className="space-y-1.5 border-t border-line pt-4 text-[0.8125rem] leading-relaxed text-ink-secondary">
                  {current.lines.map((line, idx) => (
                    <motion.div
                      key={line}
                      initial={{ opacity: 0.3, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.2,
                        delay: idx * 0.08,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      {line}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
