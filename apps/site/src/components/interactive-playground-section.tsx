"use client";

import { usePglitePlayground } from "@tydbase/wasm-playground";
import {
  Check,
  Database,
  Eye,
  EyeOff,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { type KeyboardEvent, useState } from "react";

type PlaygroundTab = "sql" | "nosql-vector" | "mcp";
type MultiParadigmView = "mongodb" | "redis" | "vector";
type McpClientKey = "claude" | "codex" | "gemini";

const MCP_CLIENTS: Record<
  McpClientKey,
  { name: string; command: string; clientId: string; query: string }
> = {
  claude: {
    name: "Claude Code",
    command: "claude mcp add --transport http tydbase https://mcp.tydbase.com/v1",
    clientId: "claude-code",
    query: "SELECT full_name, email, role FROM members ORDER BY last_query_ms ASC;",
  },
  codex: {
    name: "OpenAI Codex",
    command: "tydbase mcp install --client codex",
    clientId: "openai-codex",
    query: "SELECT full_name, email, role FROM members WHERE role IN ('owner', 'admin');",
  },
  gemini: {
    name: "Gemini CLI",
    command: "tydbase mcp install --client gemini",
    clientId: "gemini-cli",
    query: "SELECT full_name, email, role FROM members LIMIT 4;",
  },
};

const MCP_SAMPLE_ROWS = [
  {
    name: "Ramiro Silva",
    rawEmail: "ramiro@northstar.dev",
    maskedEmail: "r***@northstar.dev",
    role: "owner",
  },
  {
    name: "Nadia Haddad",
    rawEmail: "nadia@northstar.dev",
    maskedEmail: "n***@northstar.dev",
    role: "editor",
  },
  {
    name: "Soren Lindqvist",
    rawEmail: "soren@kestrelpay.io",
    maskedEmail: "s***@kestrelpay.io",
    role: "admin",
  },
  {
    name: "Tariq Chowdhury",
    rawEmail: "tariq@harborml.ai",
    maskedEmail: "t***@harborml.ai",
    role: "owner",
  },
];

const VECTOR_ROWS = [
  {
    id: "doc_412",
    title: "Relay agent mTLS handshake guide",
    dims: 1536,
    cosine: "0.962",
    index: "hnsw_cosine",
  },
  {
    id: "doc_398",
    title: "WASM PII masker policy spec",
    dims: 1536,
    cosine: "0.941",
    index: "hnsw_cosine",
  },
  {
    id: "doc_377",
    title: "MCP OAuth 2.1 PKCE token flow",
    dims: 1536,
    cosine: "0.918",
    index: "hnsw_cosine",
  },
  {
    id: "doc_351",
    title: "PostgreSQL read-only tx wrapper",
    dims: 1536,
    cosine: "0.884",
    index: "hnsw_cosine",
  },
];

const REDIS_ROWS = [
  { key: "mcp:oauth:tok:98f2", type: "string", ttl: "54m 12s", size: "412 B" },
  { key: "relay:agent:vpc-prod-1", type: "hash", ttl: "28s", size: "1.2 KB" },
  { key: "ratelimit:waitlist:203.0.113.4", type: "zset", ttl: "44s", size: "196 B" },
  { key: "query:cache:northstar:44", type: "string", ttl: "9m 05s", size: "4.8 KB" },
];

const MONGO_DOCUMENT = `{
  "_id": "673f8c2a91b4e2001c884a19",
  "workspace": "northstar-labs",
  "environment": "staging",
  "connection": {
    "engine": "mongodb",
    "mode": "relay-agent",
    "agent": "vpc-us-east-1a"
  },
  "mcpPolicy": {
    "mode": "read_with_write_approval",
    "piiMaskingPlugin": "wasm://tydbase/pii-masker@1.0",
    "maxRows": 500
  }
}`;

export function InteractivePlaygroundSection() {
  const [activeTab, setActiveTab] = useState<PlaygroundTab>("sql");
  const { status, error, result, presets, runQuery, resetDb } = usePglitePlayground();
  const [sqlInput, setSqlInput] = useState<string>(presets[0]?.sql ?? "SELECT 1;");
  const [selectedPresetId, setSelectedPresetId] = useState<string>(presets[0]?.id ?? "");

  const [paradigmView, setParadigmView] = useState<MultiParadigmView>("vector");
  const [mcpClient, setMcpClient] = useState<McpClientKey>("claude");
  const [piiMasking, setPiiMasking] = useState(true);
  const [mutationDecision, setMutationDecision] = useState<"pending" | "approved" | "rejected">(
    "pending"
  );

  function handlePresetClick(id: string, sql: string) {
    setSelectedPresetId(id);
    setSqlInput(sql);
    void runQuery(sql);
  }

  function handleEditorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void runQuery(sqlInput);
    }
  }

  const activeMcp = MCP_CLIENTS[mcpClient];

  return (
    <section
      id="playground"
      className="border-b border-line"
      style={{ paddingBlock: "var(--space-12)" }}
    >
      <div className="tyd-container flex flex-col gap-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-[56ch]">
            <h2 className="tyd-section-head font-semibold text-ink">
              Test the SQL engine and MCP guardrails right here.
            </h2>
            <p className="mt-3 text-lg leading-relaxed text-ink-secondary">
              The first tab boots a real PostgreSQL instance inside your browser via WebAssembly.
              Edit the query, hit Cmd+Enter, or switch tabs to inspect NoSQL, vectors, and MCP
              policies.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Interactive playground views"
            className="inline-flex flex-wrap gap-1.5 rounded-lg border border-line bg-surface-well p-1.5"
          >
            {(
              [
                { id: "sql", label: "Live PostgreSQL (WASM)" },
                { id: "nosql-vector", label: "NoSQL & Vector" },
                { id: "mcp", label: "MCP & AI Guardrails" },
              ] as const
            ).map((tab) => {
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveTab(tab.id)}
                  className={`h-10 rounded-md px-4 text-sm font-medium whitespace-nowrap transition-colors ${
                    selected
                      ? "bg-accent text-accent-ink"
                      : "text-ink-secondary hover:bg-surface-raised hover:text-ink"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="tyd-panel overflow-hidden">
          {activeTab === "sql" && (
            <div className="divide-y divide-line">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-well px-5 py-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  {presets.map((preset) => {
                    const isSelected = selectedPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handlePresetClick(preset.id, preset.sql)}
                        className={`rounded-md border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                          isSelected
                            ? "border-accent bg-accent-tint text-accent"
                            : "border-line text-ink-secondary hover:border-line-strong hover:text-ink"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void resetDb()}
                    disabled={status === "booting" || status === "running"}
                    className="inline-flex h-10 items-center gap-1.5 rounded-md border border-line-strong px-3 text-sm font-medium text-ink-secondary transition-colors hover:text-ink disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    Reset DB
                  </button>
                  <button
                    type="button"
                    onClick={() => void runQuery(sqlInput)}
                    disabled={status === "booting" || status === "running"}
                    className="inline-flex h-10 items-center gap-1.5 rounded-md bg-accent px-4 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-50"
                  >
                    <Play className="h-3.5 w-3.5" aria-hidden="true" />
                    {status === "booting"
                      ? "Booting WASM…"
                      : status === "running"
                        ? "Running…"
                        : "Run query"}
                  </button>
                </div>
              </div>

              <div className="bg-surface-well/50 p-5">
                <label htmlFor="pglite-sql-editor" className="sr-only">
                  In-browser PostgreSQL query editor
                </label>
                <textarea
                  id="pglite-sql-editor"
                  value={sqlInput}
                  onChange={(e) => setSqlInput(e.target.value)}
                  onKeyDown={handleEditorKeyDown}
                  rows={6}
                  spellCheck={false}
                  className="w-full resize-y rounded-md border border-edge bg-surface-well p-4 font-mono text-sm leading-relaxed text-ink"
                />
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
                  <span>Engine: PostgreSQL running locally inside your browser (PGlite WASM)</span>
                  <span>Shortcut: Cmd/Ctrl + Enter</span>
                </div>
              </div>

              <div className="px-5 py-4">
                {error ? (
                  <div
                    role="alert"
                    className="rounded-md border border-danger/50 bg-danger-tint px-4 py-3 font-mono text-sm text-danger"
                  >
                    {error}
                  </div>
                ) : result ? (
                  <div>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
                      <span className="tyd-tabular text-accent">
                        {result.rows.length} rows returned in {result.durationMs} ms
                      </span>
                      <span className="tyd-tabular">Executed at {result.executedAt}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-line text-ink-muted">
                            {result.columns.map((col) => (
                              <th key={col} className="pb-2.5 pr-6 font-medium whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line/60 font-mono text-[0.8125rem] text-ink-secondary">
                          {result.rows.map((row, rowIdx) => (
                            <tr key={rowIdx}>
                              {result.columns.map((col) => {
                                const rawVal = row[col];
                                const text =
                                  rawVal === null || rawVal === undefined
                                    ? "null"
                                    : typeof rawVal === "object"
                                      ? JSON.stringify(rawVal)
                                      : String(rawVal);
                                return (
                                  <td
                                    key={`${rowIdx}-${col}`}
                                    className="py-2.5 pr-6 tyd-tabular whitespace-nowrap first:text-ink"
                                  >
                                    {text}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="py-6 text-sm text-ink-muted">
                    Initializing in-browser PostgreSQL WebAssembly runtime…
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === "nosql-vector" && (
            <div className="divide-y divide-line">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-well px-5 py-3.5">
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { id: "vector", label: "Vector (pgvector / Qdrant)" },
                      { id: "mongodb", label: "MongoDB document" },
                      { id: "redis", label: "Redis / Valkey keys" },
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setParadigmView(mode.id)}
                      className={`rounded-md border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                        paradigmView === mode.id
                          ? "border-accent bg-accent-tint text-accent"
                          : "border-line text-ink-secondary hover:border-line-strong hover:text-ink"
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                  <Database className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                  Unified 4-paradigm Go driver interface
                </span>
              </div>

              <div className="p-5">
                {paradigmView === "vector" && (
                  <div className="overflow-x-auto">
                    <p className="mb-4 text-sm text-ink-secondary">
                      Inspect vector column dimensions, HNSW indexes, and cosine similarity scores
                      alongside relational metadata.
                    </p>
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-line text-ink-muted">
                          <th className="pb-2.5 pr-6 font-medium">Document id</th>
                          <th className="pb-2.5 pr-6 font-medium">Chunk title</th>
                          <th className="pb-2.5 pr-6 font-medium">Dimensions</th>
                          <th className="pb-2.5 pr-6 font-medium">Index</th>
                          <th className="pb-2.5 font-medium">Cosine score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/60 font-mono text-[0.8125rem] text-ink-secondary">
                        {VECTOR_ROWS.map((row) => (
                          <tr key={row.id}>
                            <td className="py-2.5 pr-6 text-ink">{row.id}</td>
                            <td className="py-2.5 pr-6 font-sans text-ink">{row.title}</td>
                            <td className="py-2.5 pr-6 tyd-tabular">{row.dims}</td>
                            <td className="py-2.5 pr-6">{row.index}</td>
                            <td className="py-2.5 tyd-tabular text-accent">{row.cosine}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {paradigmView === "mongodb" && (
                  <div>
                    <p className="mb-4 text-sm text-ink-secondary">
                      Browse MongoDB collections, infer JSON schemas, and run aggregation pipelines
                      without installing Compass.
                    </p>
                    <pre className="overflow-x-auto rounded-md border border-line bg-surface-well p-4 font-mono text-[0.8125rem] leading-relaxed text-ink">
                      <code>{MONGO_DOCUMENT}</code>
                    </pre>
                  </div>
                )}

                {paradigmView === "redis" && (
                  <div className="overflow-x-auto">
                    <p className="mb-4 text-sm text-ink-secondary">
                      Walk Redis and Valkey prefix trees, inspect live TTLs, and run safe commands
                      through the same connection vault.
                    </p>
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-line text-ink-muted">
                          <th className="pb-2.5 pr-6 font-medium">Key</th>
                          <th className="pb-2.5 pr-6 font-medium">Type</th>
                          <th className="pb-2.5 pr-6 font-medium">TTL</th>
                          <th className="pb-2.5 font-medium">Payload size</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/60 font-mono text-[0.8125rem] text-ink-secondary">
                        {REDIS_ROWS.map((row) => (
                          <tr key={row.key}>
                            <td className="py-2.5 pr-6 text-ink">{row.key}</td>
                            <td className="py-2.5 pr-6">{row.type}</td>
                            <td className="py-2.5 pr-6 tyd-tabular text-accent">{row.ttl}</td>
                            <td className="py-2.5 tyd-tabular">{row.size}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "mcp" && (
            <div className="divide-y divide-line">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-well px-5 py-3.5">
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(MCP_CLIENTS) as McpClientKey[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMcpClient(key)}
                      className={`rounded-md border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                        mcpClient === key
                          ? "border-accent bg-accent-tint text-accent"
                          : "border-line text-ink-secondary hover:border-line-strong hover:text-ink"
                      }`}
                    >
                      {MCP_CLIENTS[key].name}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setPiiMasking((prev) => !prev)}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-line-strong px-3.5 text-sm font-medium text-ink transition-colors hover:border-accent"
                >
                  {piiMasking ? (
                    <EyeOff className="h-4 w-4 text-accent" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4 text-warn" aria-hidden="true" />
                  )}
                  WASM PII masking: {piiMasking ? "On" : "Off"}
                </button>
              </div>

              <div className="grid grid-cols-1 divide-y divide-line lg:grid-cols-12 lg:divide-x lg:divide-y-0">
                <div className="flex flex-col gap-4 p-5 lg:col-span-7">
                  <div>
                    <p className="text-xs font-medium text-ink-muted">One-command OAuth setup</p>
                    <pre className="mt-2 overflow-x-auto rounded-md border border-line bg-surface-well px-3.5 py-2.5 font-mono text-xs text-accent">
                      <code>{activeMcp.command}</code>
                    </pre>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-ink-muted">
                      Tool call: execute_read_query ({activeMcp.clientId})
                    </p>
                    <pre className="mt-2 overflow-x-auto rounded-md border border-line bg-surface-well px-3.5 py-2.5 font-mono text-xs text-ink">
                      <code>{activeMcp.query}</code>
                    </pre>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-line text-ink-muted">
                          <th className="pb-2 pr-4 font-medium">Name</th>
                          <th className="pb-2 pr-4 font-medium">Email returned to LLM</th>
                          <th className="pb-2 font-medium">Role</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/60 font-mono text-xs text-ink-secondary">
                        {MCP_SAMPLE_ROWS.map((row) => (
                          <tr key={row.rawEmail}>
                            <td className="py-2 pr-4 font-sans text-ink">{row.name}</td>
                            <td className={`py-2 pr-4 ${piiMasking ? "text-accent" : "text-warn"}`}>
                              {piiMasking ? row.maskedEmail : row.rawEmail}
                            </td>
                            <td className="py-2">{row.role}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-5 bg-surface-raised/45 p-5 lg:col-span-5">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                      {mutationDecision === "approved" ? (
                        <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />
                      ) : (
                        <ShieldAlert className="h-4 w-4 text-warn" aria-hidden="true" />
                      )}
                      <span>Human-in-the-loop mutation gate</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                      When {activeMcp.name} calls{" "}
                      <code className="font-mono text-ink">propose_mutation</code> on production,
                      TydBase runs a dry-run check and pauses execution until a teammate approves.
                    </p>

                    <div className="mt-4 rounded-md border border-line bg-surface-well p-3.5 font-mono text-xs leading-relaxed text-ink">
                      <div className="mb-1.5 flex items-center gap-1.5 text-ink-muted">
                        <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>propose_mutation (production)</span>
                      </div>
                      <code>
                        UPDATE subscriptions SET status = &apos;paused&apos; WHERE past_due_days
                        &gt; 30;
                      </code>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <p
                      role="status"
                      className={`text-sm font-medium ${
                        mutationDecision === "approved"
                          ? "text-accent"
                          : mutationDecision === "rejected"
                            ? "text-danger"
                            : "text-warn"
                      }`}
                    >
                      {mutationDecision === "pending" && "Status: Waiting on teammate approval"}
                      {mutationDecision === "approved" &&
                        "Status: Approved, executed in transaction, logged"}
                      {mutationDecision === "rejected" &&
                        "Status: Rejected, agent notified with policy reason"}
                    </p>

                    <div className="flex flex-wrap gap-2.5">
                      {mutationDecision === "pending" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setMutationDecision("approved")}
                            className="tyd-btn-primary"
                          >
                            <Check className="h-4 w-4" aria-hidden="true" />
                            Approve write
                          </button>
                          <button
                            type="button"
                            onClick={() => setMutationDecision("rejected")}
                            className="inline-flex h-12 items-center justify-center rounded-md border border-danger/60 bg-danger-tint px-4 text-sm font-medium text-danger transition-colors hover:border-danger"
                          >
                            Block write
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setMutationDecision("pending")}
                          className="tyd-btn-secondary whitespace-nowrap"
                        >
                          Reset simulation
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
