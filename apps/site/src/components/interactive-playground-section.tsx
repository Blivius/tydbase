"use client";

import { usePglitePlayground } from "@tydbase/wasm-playground";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Database,
  Eye,
  EyeOff,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type KeyboardEvent, useEffect, useState } from "react";

type PlaygroundTab = "sql" | "nosql-vector" | "mcp";
type MultiParadigmView = "vector" | "mongodb" | "redis";
type McpClientKey = "claude" | "codex" | "gemini";
type VectorQueryKey = "relay" | "pii" | "oauth";

interface VectorMatch {
  id: string;
  title: string;
  dims: number;
  scores: Record<VectorQueryKey, number>;
  index: string;
}

const VECTOR_QUERIES: Record<VectorQueryKey, { label: string; prompt: string }> = {
  relay: {
    label: "Private VPC tunnel",
    prompt: "How does the outbound relay reach private AWS RDS without open ports?",
  },
  pii: {
    label: "PII masking policy",
    prompt: "Redact email and phone columns before sending results to Claude MCP",
  },
  oauth: {
    label: "MCP OAuth 2.1 flow",
    prompt: "Authenticate Codex and Gemini CLI using PKCE without local passwords",
  },
};

const VECTOR_DOCS: VectorMatch[] = [
  {
    id: "doc_412",
    title: "Relay agent WSS/mTLS outbound handshake",
    dims: 1536,
    scores: { relay: 0.968, pii: 0.421, oauth: 0.614 },
    index: "hnsw_cosine",
  },
  {
    id: "doc_398",
    title: "wazero WebAssembly PII masker hook spec",
    dims: 1536,
    scores: { relay: 0.388, pii: 0.974, oauth: 0.512 },
    index: "hnsw_cosine",
  },
  {
    id: "doc_377",
    title: "OAuth 2.1 PKCE Protected Resource Metadata",
    dims: 1536,
    scores: { relay: 0.542, pii: 0.495, oauth: 0.961 },
    index: "hnsw_cosine",
  },
  {
    id: "doc_351",
    title: "PostgreSQL read-only transaction wrapper",
    dims: 1536,
    scores: { relay: 0.612, pii: 0.783, oauth: 0.689 },
    index: "hnsw_cosine",
  },
];

interface RedisEntry {
  key: string;
  type: string;
  initialSeconds: number;
  size: string;
}

const REDIS_ENTRIES: RedisEntry[] = [
  { key: "mcp:oauth:tok:98f2", type: "string", initialSeconds: 3252, size: "412 B" },
  { key: "relay:agent:vpc-prod-1", type: "hash", initialSeconds: 28, size: "1.2 KB" },
  { key: "ratelimit:waitlist:203.0.113.4", type: "zset", initialSeconds: 44, size: "196 B" },
  { key: "query:cache:northstar:44", type: "string", initialSeconds: 545, size: "4.8 KB" },
];

function formatTtl(seconds: number): string {
  const safe = Math.max(1, seconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${String(secs).padStart(2, "0")}s`;
}

function maskEmailValue(value: string): string {
  const atIndex = value.indexOf("@");
  if (atIndex <= 1) return value;
  return `${value.slice(0, 1)}***${value.slice(atIndex)}`;
}

const MCP_CLIENTS: Record<
  McpClientKey,
  { name: string; command: string; clientId: string; query: string; mutation: string }
> = {
  claude: {
    name: "Claude Code",
    command: "claude mcp add --transport http tydbase https://mcp.tydbase.com/v1",
    clientId: "claude-code",
    query: "SELECT full_name, email, role FROM members ORDER BY last_query_ms ASC;",
    mutation: "UPDATE subscriptions SET status = 'paused' WHERE past_due_days > 30;",
  },
  codex: {
    name: "OpenAI Codex",
    command: "tydbase mcp install --client codex",
    clientId: "openai-codex",
    query: "SELECT full_name, email, role FROM members WHERE role IN ('owner', 'admin');",
    mutation: "DELETE FROM expired_invitations WHERE created_at < now() - interval '14 days';",
  },
  gemini: {
    name: "Gemini CLI",
    command: "tydbase mcp install --client gemini",
    clientId: "gemini-cli",
    query: "SELECT full_name, email, role FROM members LIMIT 4;",
    mutation: "ALTER TABLE audit_events ADD COLUMN agent_trace_id TEXT;",
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

export function InteractivePlaygroundSection() {
  const [activeTab, setActiveTab] = useState<PlaygroundTab>("sql");
  const { status, error, result, presets, runQuery, resetDb } = usePglitePlayground();
  const [sqlInput, setSqlInput] = useState<string>(presets[0]?.sql ?? "SELECT 1;");
  const [selectedPresetId, setSelectedPresetId] = useState<string>(presets[0]?.id ?? "");
  const [sqlPiiMask, setSqlPiiMask] = useState(false);

  const [paradigmView, setParadigmView] = useState<MultiParadigmView>("vector");
  const [vectorQuery, setVectorQuery] = useState<VectorQueryKey>("relay");
  const [mongoExpanded, setMongoExpanded] = useState({ connection: true, mcpPolicy: true });
  const [ttlTick, setTtlTick] = useState(0);

  const [mcpClient, setMcpClient] = useState<McpClientKey>("claude");
  const [piiMasking, setPiiMasking] = useState(true);
  const [traceStep, setTraceStep] = useState<number>(4);
  const [isTracing, setIsTracing] = useState(false);
  const [mutationDecision, setMutationDecision] = useState<"pending" | "approved" | "rejected">(
    "pending"
  );

  // Live 1-second TTL tick when Redis inspector is visible
  useEffect(() => {
    if (activeTab !== "nosql-vector" || paradigmView !== "redis") return;
    const id = window.setInterval(() => setTtlTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [activeTab, paradigmView]);

  // Step-by-step animated MCP trace playback
  useEffect(() => {
    if (!isTracing) return;
    if (traceStep >= 4) {
      const doneTimer = window.setTimeout(() => setIsTracing(false), 150);
      return () => window.clearTimeout(doneTimer);
    }
    const timer = window.setTimeout(() => {
      setTraceStep((s) => s + 1);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [isTracing, traceStep]);

  function startAgentTrace() {
    setMutationDecision("pending");
    setTraceStep(1);
    setIsTracing(true);
  }

  function handlePresetClick(id: string, sql: string) {
    setSelectedPresetId(id);
    setSqlInput(sql);
    if (id === "pii-members") {
      setSqlPiiMask(true);
    }
    void runQuery(sql);
  }

  function handleEditorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void runQuery(sqlInput);
    }
  }

  const activeMcp = MCP_CLIENTS[mcpClient];
  const rankedVectors = VECTOR_DOCS.toSorted(
    (a, b) => b.scores[vectorQuery] - a.scores[vectorQuery]
  );

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
              Edit the query, hit Cmd+Enter, or switch tabs to inspect NoSQL, live vector ranking,
              and step-by-step MCP traces.
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
          <AnimatePresence mode="wait" initial={false}>
            {activeTab === "sql" && (
              <motion.div
                key="tab-sql"
                initial={{ opacity: 0.35, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0.35, y: -6 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="divide-y divide-line"
              >
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

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSqlPiiMask((prev) => !prev)}
                      className={`inline-flex h-10 items-center gap-1.5 rounded-md border px-3 text-sm font-medium whitespace-nowrap transition-colors ${
                        sqlPiiMask
                          ? "border-accent bg-accent-tint text-accent"
                          : "border-line-strong text-ink-secondary hover:text-ink"
                      }`}
                    >
                      {sqlPiiMask ? (
                        <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      PII mask: {sqlPiiMask ? "On" : "Off"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void resetDb()}
                      disabled={status === "booting" || status === "running"}
                      className="inline-flex h-10 items-center gap-1.5 rounded-md border border-line-strong px-3 text-sm font-medium whitespace-nowrap text-ink-secondary transition-colors hover:text-ink disabled:opacity-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      Reset DB
                    </button>
                    <button
                      type="button"
                      onClick={() => void runQuery(sqlInput)}
                      disabled={status === "booting" || status === "running"}
                      className="inline-flex h-10 items-center gap-1.5 rounded-md bg-accent px-4 text-sm font-semibold whitespace-nowrap text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-50"
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
                    <span>
                      Engine: PostgreSQL running locally inside your browser (PGlite WASM)
                    </span>
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
                              <motion.tr
                                key={`${result.executedAt}-${rowIdx}`}
                                initial={{ opacity: 0.35, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                  duration: 0.18,
                                  delay: Math.min(rowIdx * 0.035, 0.25),
                                  ease: [0.16, 1, 0.3, 1],
                                }}
                              >
                                {result.columns.map((col) => {
                                  const rawVal = row[col];
                                  let text =
                                    rawVal === null || rawVal === undefined
                                      ? "null"
                                      : typeof rawVal === "object"
                                        ? JSON.stringify(rawVal)
                                        : String(rawVal);
                                  const isEmailCol = col.toLowerCase().includes("email");
                                  if (sqlPiiMask && isEmailCol) {
                                    text = maskEmailValue(text);
                                  }
                                  return (
                                    <td
                                      key={`${rowIdx}-${col}`}
                                      className={`py-2.5 pr-6 tyd-tabular whitespace-nowrap first:text-ink ${
                                        sqlPiiMask && isEmailCol ? "text-accent" : ""
                                      }`}
                                    >
                                      {text}
                                    </td>
                                  );
                                })}
                              </motion.tr>
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
              </motion.div>
            )}

            {activeTab === "nosql-vector" && (
              <motion.div
                key="tab-nosql"
                initial={{ opacity: 0.35, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0.35, y: -6 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="divide-y divide-line"
              >
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
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-ink-secondary">
                          Switch the semantic prompt to watch HNSW cosine rankings reorder live.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {(Object.keys(VECTOR_QUERIES) as VectorQueryKey[]).map((key) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setVectorQuery(key)}
                              className={`rounded-md border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                                vectorQuery === key
                                  ? "border-accent bg-accent-tint text-accent"
                                  : "border-line text-ink-secondary hover:border-line-strong hover:text-ink"
                              }`}
                            >
                              {VECTOR_QUERIES[key].label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-md border border-line bg-surface-well px-4 py-3 text-sm text-ink">
                        <span className="text-ink-muted">Query vector: </span>
                        <code className="font-mono text-xs text-ink">
                          &quot;{VECTOR_QUERIES[vectorQuery].prompt}&quot;
                        </code>
                      </div>

                      <div className="divide-y divide-line">
                        {rankedVectors.map((doc) => {
                          const score = doc.scores[vectorQuery];
                          return (
                            <motion.div
                              key={doc.id}
                              layout
                              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                              className="grid grid-cols-1 items-center gap-3 py-3 sm:grid-cols-12"
                            >
                              <div className="font-mono text-xs text-ink-muted sm:col-span-2">
                                {doc.id}
                              </div>
                              <div className="text-sm font-medium text-ink sm:col-span-5">
                                {doc.title}
                              </div>
                              <div className="sm:col-span-3">
                                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-well">
                                  <motion.div
                                    animate={{ scaleX: score }}
                                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                                    style={{ transformOrigin: "left" }}
                                    className="h-full w-full bg-accent"
                                  />
                                </div>
                              </div>
                              <div className="text-right font-mono text-xs text-accent tyd-tabular sm:col-span-2">
                                {score.toFixed(3)} ({doc.dims}d)
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {paradigmView === "mongodb" && (
                    <div className="space-y-4">
                      <p className="text-sm text-ink-secondary">
                        Expand or collapse nested BSON nodes and inspect inferred schema fields
                        without leaving the browser.
                      </p>
                      <pre className="overflow-x-auto rounded-md border border-line bg-surface-well p-4 font-mono text-sm leading-relaxed text-ink">
                        <code>
                          <div>{"{"}</div>
                          <div className="pl-4 text-ink-secondary">
                            &quot;_id&quot;:{" "}
                            <span className="text-accent">
                              &quot;673f8c2a91b4e2001c884a19&quot;
                            </span>
                            ,
                          </div>
                          <div className="pl-4 text-ink-secondary">
                            &quot;workspace&quot;:{" "}
                            <span className="text-ink">&quot;northstar-labs&quot;</span>,
                          </div>
                          <div className="pl-4">
                            <button
                              type="button"
                              onClick={() =>
                                setMongoExpanded((prev) => ({
                                  ...prev,
                                  connection: !prev.connection,
                                }))
                              }
                              className="inline-flex items-center gap-1 text-ink hover:text-accent"
                            >
                              {mongoExpanded.connection ? (
                                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                              &quot;connection&quot;:{" "}
                              {mongoExpanded.connection ? "{" : "{ 3 fields },"}
                            </button>
                            {mongoExpanded.connection && (
                              <div className="pl-6 text-ink-secondary">
                                <div>&quot;engine&quot;: &quot;mongodb&quot;,</div>
                                <div>&quot;mode&quot;: &quot;relay-agent&quot;,</div>
                                <div>&quot;agent&quot;: &quot;vpc-us-east-1a&quot;</div>
                                <div>{"},"}</div>
                              </div>
                            )}
                          </div>
                          <div className="pl-4">
                            <button
                              type="button"
                              onClick={() =>
                                setMongoExpanded((prev) => ({
                                  ...prev,
                                  mcpPolicy: !prev.mcpPolicy,
                                }))
                              }
                              className="inline-flex items-center gap-1 text-ink hover:text-accent"
                            >
                              {mongoExpanded.mcpPolicy ? (
                                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                              &quot;mcpPolicy&quot;:{" "}
                              {mongoExpanded.mcpPolicy ? "{" : "{ 3 fields }"}
                            </button>
                            {mongoExpanded.mcpPolicy && (
                              <div className="pl-6 text-ink-secondary">
                                <div>
                                  &quot;mode&quot;:{" "}
                                  <span className="text-accent">
                                    &quot;read_with_write_approval&quot;
                                  </span>
                                  ,
                                </div>
                                <div>
                                  &quot;piiMaskingPlugin&quot;:
                                  &quot;wasm://tydbase/pii-masker@1.0&quot;,
                                </div>
                                <div>&quot;maxRows&quot;: 500</div>
                                <div>{"}"}</div>
                              </div>
                            )}
                          </div>
                          <div>{"}"}</div>
                        </code>
                      </pre>
                    </div>
                  )}

                  {paradigmView === "redis" && (
                    <div className="overflow-x-auto">
                      <p className="mb-4 text-sm text-ink-secondary">
                        Live ticking TTL countdowns across Redis and Valkey namespaces, bridged
                        through the same connection vault.
                      </p>
                      <table className="w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-line text-ink-muted">
                            <th className="pb-2.5 pr-6 font-medium">Key</th>
                            <th className="pb-2.5 pr-6 font-medium">Type</th>
                            <th className="pb-2.5 pr-6 font-medium">Live TTL</th>
                            <th className="pb-2.5 font-medium">Payload size</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line/60 font-mono text-[0.8125rem] text-ink-secondary">
                          {REDIS_ENTRIES.map((row) => {
                            const remaining =
                              (((row.initialSeconds - ttlTick) % row.initialSeconds) +
                                row.initialSeconds) %
                                row.initialSeconds || row.initialSeconds;
                            return (
                              <tr key={row.key}>
                                <td className="py-2.5 pr-6 text-ink">{row.key}</td>
                                <td className="py-2.5 pr-6">{row.type}</td>
                                <td className="py-2.5 pr-6 tyd-tabular text-accent">
                                  {formatTtl(remaining)}
                                </td>
                                <td className="py-2.5 tyd-tabular">{row.size}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "mcp" && (
              <motion.div
                key="tab-mcp"
                initial={{ opacity: 0.35, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0.35, y: -6 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="divide-y divide-line"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-well px-5 py-3.5">
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(MCP_CLIENTS) as McpClientKey[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setMcpClient(key);
                          startAgentTrace();
                        }}
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

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={startAgentTrace}
                      className="inline-flex h-10 items-center gap-1.5 rounded-md bg-accent px-3.5 text-sm font-semibold whitespace-nowrap text-accent-ink transition-colors hover:bg-accent-hover"
                    >
                      <Play className="h-3.5 w-3.5" aria-hidden="true" />
                      Replay agent trace
                    </button>
                    <button
                      type="button"
                      onClick={() => setPiiMasking((prev) => !prev)}
                      className="inline-flex h-10 items-center gap-2 rounded-md border border-line-strong px-3.5 text-sm font-medium whitespace-nowrap text-ink transition-colors hover:border-accent"
                    >
                      {piiMasking ? (
                        <EyeOff className="h-4 w-4 text-accent" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4 text-warn" aria-hidden="true" />
                      )}
                      WASM PII masking: {piiMasking ? "On" : "Off"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 divide-y divide-line lg:grid-cols-12 lg:divide-x lg:divide-y-0">
                  <div className="flex flex-col gap-4 p-5 lg:col-span-7">
                    <div>
                      <p className="text-xs font-medium text-ink-muted">One-command OAuth setup</p>
                      <pre className="mt-2 overflow-x-auto rounded-md border border-line bg-surface-well px-3.5 py-2.5 font-mono text-xs text-accent">
                        <code>{activeMcp.command}</code>
                      </pre>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-ink-muted">
                        Live MCP pipeline ({activeMcp.clientId})
                      </p>
                      <ol className="divide-y divide-line rounded-md border border-line bg-surface-well text-xs">
                        {[
                          {
                            step: 1,
                            text: "OAuth 2.1 PKCE token verified (scope: workspace:northstar)",
                          },
                          { step: 2, text: "search_schema('members') -> 2 tables, 11 columns" },
                          {
                            step: 3,
                            text: `execute_read_query -> 4 rows (${piiMasking ? "WASM PII masker active" : "PII masker disabled"})`,
                          },
                          {
                            step: 4,
                            text: "propose_mutation -> intercepted by production approval policy",
                          },
                        ].map((entry) => {
                          const reached = traceStep >= entry.step;
                          return (
                            <motion.li
                              key={entry.step}
                              animate={{ opacity: reached ? 1 : 0.35 }}
                              transition={{ duration: 0.2 }}
                              className="flex items-center justify-between gap-2 px-3.5 py-2 font-mono"
                            >
                              <span className={reached ? "text-ink" : "text-ink-muted"}>
                                {entry.step}. {entry.text}
                              </span>
                              <span className={reached ? "text-accent" : "text-ink-muted"}>
                                {reached ? "ok" : "…"}
                              </span>
                            </motion.li>
                          );
                        })}
                      </ol>
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
                              <td
                                className={`py-2 pr-4 ${piiMasking ? "text-accent" : "text-warn"}`}
                              >
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
                        <code>{activeMcp.mutation}</code>
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
                              className="inline-flex h-12 items-center justify-center rounded-md border border-danger/60 bg-danger-tint px-4 text-sm font-medium whitespace-nowrap text-danger transition-colors hover:border-danger"
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
