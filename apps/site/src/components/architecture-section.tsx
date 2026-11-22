"use client";

import { Cpu, GlobeLock, Layers, Terminal } from "lucide-react";
import { useState } from "react";

type CliMode = "start" | "agent" | "mcp";

const CLI_MODES: Record<CliMode, { label: string; command: string; output: string }> = {
  start: {
    label: "Local self-host",
    command: "tydbase start",
    output: `TydBase local engine ready (embedded SQLite metadata)
Web workspace: http://localhost:4800
MCP stdio & HTTP: enabled for local databases`,
  },
  agent: {
    label: "Private VPC / localhost relay",
    command: "tydbase agent --token tb_agt_prod_us_east",
    output: `Outbound WSS/mTLS tunnel connected -> api.tydbase.com
Zero inbound firewall ports required
Bridging: postgres://10.0.4.12:5432, redis://10.0.4.18:6379`,
  },
  mcp: {
    label: "Wire AI clients",
    command: "tydbase mcp install --client claude,codex,gemini,cursor",
    output: `Registered OAuth 2.1 endpoint: https://mcp.tydbase.com/v1
Tools exposed: 6 (list_connections, search_schema, describe_object,
  execute_read_query, explain_query, propose_mutation)`,
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
              {(Object.keys(CLI_MODES) as CliMode[]).map((key) => (
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

            <div className="space-y-4 p-5 font-mono text-sm">
              <div className="flex items-center gap-2 text-accent">
                <Terminal className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>$ {current.command}</span>
              </div>
              <pre className="overflow-x-auto border-t border-line pt-4 text-[0.8125rem] leading-relaxed text-ink-secondary">
                <code>{current.output}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
