"use client";

import { TydBaseLogo } from "@tydbase/ui";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Database,
  Eye,
  EyeOff,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Video,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

interface DemoScene {
  id: number;
  title: string;
  durationMs: number;
  caption: string;
}

const SCENES: DemoScene[] = [
  {
    id: 0,
    title: "The fragmentation",
    durationMs: 9500,
    caption:
      "Four heavy desktop clients, raw passwords pasted in Slack, and local mcp.json files exposing production.",
  },
  {
    id: 1,
    title: "One browser workspace",
    durationMs: 10500,
    caption:
      "TydBase unifies PostgreSQL (+ pgvector), MySQL, MongoDB, and Redis in one zero-install workspace.",
  },
  {
    id: 2,
    title: "Outbound VPC & localhost relay",
    durationMs: 10500,
    caption:
      "One Go binary dials outbound over WSS/mTLS from your VPC or laptop with zero open firewall ports.",
  },
  {
    id: 3,
    title: "Governed MCP control plane",
    durationMs: 12000,
    caption:
      "Claude, Codex, Gemini, and Cursor share one OAuth endpoint. WASM masks PII; production writes wait for approval.",
  },
  {
    id: 4,
    title: "Self-host free or use Cloud",
    durationMs: 8500,
    caption:
      "Self-host every feature for $0 forever under Apache-2.0, or pay only when using managed TydBase Cloud.",
  },
];

const SCENE_2_SQL = `SELECT title, dims, cosine_score
FROM ai_documents
WHERE cosine_score > 0.88
ORDER BY cosine_score DESC;`;

const SCENE_2_ROWS = [
  { title: "Relay agent mTLS handshake", dims: "1536d", score: 0.968 },
  { title: "wazero WASM PII masker spec", dims: "1536d", score: 0.941 },
  { title: "OAuth 2.1 PKCE MCP token flow", dims: "1536d", score: 0.918 },
];

const SCENE_3_LOGS = [
  "$ tydbase agent --token tb_agt_vpc_prod_us_east",
  "Dialing outbound WSS/mTLS -> api.tydbase.com (0 inbound ports)",
  "Registered: postgres://10.0.4.12:5432, redis://10.0.4.18:6379",
  "Heartbeat steady: 8 ms RTT (encrypted stream ready)",
];

const SCENE_1_APPS = [
  { name: "DataGrip.app", memMb: 1420, tag: "SQL only" },
  { name: "MongoDB Compass", memMb: 680, tag: "Document only" },
  { name: "RedisInsight", memMb: 510, tag: "KV only" },
  { name: "~/.claude/mcp.json", memMb: 140, tag: "Plaintext prod key" },
];

export default function DemoPage() {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [interactiveMode, setInteractiveMode] = useState(false);
  const [recordMode, setRecordMode] = useState(false);

  // User-interactive overrides inside Scene 2 & Scene 4
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<"pgvector" | "mongodb" | "redis">(
    "pgvector"
  );
  const [manualMask, setManualMask] = useState<boolean | null>(null);
  const [manualDecision, setManualDecision] = useState<"pending" | "approved" | "rejected" | null>(
    null
  );

  const lastFrameRef = useRef<number | null>(null);
  const currentScene = SCENES[sceneIndex] ?? SCENES[0]!;

  const goToScene = useCallback((nextIndex: number) => {
    const clamped = ((nextIndex % SCENES.length) + SCENES.length) % SCENES.length;
    setSceneIndex(clamped);
    setProgress(0);
    setManualMask(null);
    setManualDecision(null);
    lastFrameRef.current = null;
  }, []);

  const restart = useCallback(() => {
    setInteractiveMode(false);
    setSceneIndex(0);
    setProgress(0);
    setManualMask(null);
    setManualDecision(null);
    setPlaying(true);
    lastFrameRef.current = null;
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === " ") {
        event.preventDefault();
        setPlaying((p) => !p);
      } else if (event.key.toLowerCase() === "h") {
        setRecordMode((r) => !r);
      } else if (event.key === "ArrowRight") {
        goToScene(sceneIndex + 1);
      } else if (event.key === "ArrowLeft") {
        goToScene(sceneIndex - 1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goToScene, sceneIndex]);

  // Smooth requestAnimationFrame timeline (no flaky setInterval drift)
  useEffect(() => {
    if (!playing || interactiveMode) {
      lastFrameRef.current = null;
      return;
    }

    let frameId = 0;
    const duration = currentScene.durationMs;

    function tick(now: number) {
      if (lastFrameRef.current === null) {
        lastFrameRef.current = now;
      }
      const delta = now - lastFrameRef.current;
      lastFrameRef.current = now;

      setProgress((prev) => {
        const next = prev + delta / duration;
        if (next >= 1) {
          if (sceneIndex < SCENES.length - 1) {
            setSceneIndex((idx) => idx + 1);
            setManualMask(null);
            setManualDecision(null);
            return 0;
          }
          setPlaying(false);
          return 1;
        }
        return next;
      });

      frameId = window.requestAnimationFrame(tick);
    }

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [playing, interactiveMode, sceneIndex, currentScene.durationMs]);

  // Derived animation beats per scene
  const effectiveProgress = interactiveMode ? 1 : progress;

  // Scene 1: apps appear sequentially and RAM climbs smoothly
  const visibleAppsCount = Math.min(
    SCENE_1_APPS.length,
    Math.max(1, Math.floor(effectiveProgress * 5.2) + 1)
  );
  const ramUsedMb = SCENE_1_APPS.slice(0, visibleAppsCount).reduce((sum, a) => sum + a.memMb, 0);
  const showSlackLeak = effectiveProgress >= 0.42;

  // Scene 2: live SQL typing + streamed vector results
  const typedLength = Math.min(
    SCENE_2_SQL.length,
    Math.floor((effectiveProgress / 0.45) * SCENE_2_SQL.length)
  );
  const visibleSql = SCENE_2_SQL.slice(0, typedLength);
  const showScene2Results = effectiveProgress >= 0.42;

  // Scene 3: CLI lines appear step by step
  const visibleLogCount = Math.min(
    SCENE_3_LOGS.length,
    Math.max(1, Math.floor(effectiveProgress * 5) + 1)
  );

  // Scene 4: WASM PII mask flips on at 25% progress, mutation auto-approves at 65% unless overridden
  const isPiiMasked = manualMask !== null ? manualMask : effectiveProgress >= 0.25;
  const gateState: "pending" | "approved" | "rejected" =
    manualDecision !== null
      ? manualDecision
      : !interactiveMode && effectiveProgress >= 0.68
        ? "approved"
        : "pending";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface-well p-4 text-ink sm:p-8">
      {!recordMode && (
        <div className="mb-4 flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-ink-secondary transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to landing page
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-line bg-surface p-1">
              <button
                type="button"
                onClick={() => {
                  setInteractiveMode(false);
                  setPlaying(true);
                }}
                className={`h-8 rounded px-3 text-xs font-medium whitespace-nowrap transition-colors ${
                  !interactiveMode
                    ? "bg-accent text-accent-ink"
                    : "text-ink-secondary hover:text-ink"
                }`}
              >
                Guided cinema
              </button>
              <button
                type="button"
                onClick={() => {
                  setInteractiveMode(true);
                  setPlaying(false);
                }}
                className={`h-8 rounded px-3 text-xs font-medium whitespace-nowrap transition-colors ${
                  interactiveMode
                    ? "bg-accent text-accent-ink"
                    : "text-ink-secondary hover:text-ink"
                }`}
              >
                Interactive walkthrough
              </button>
            </div>

            {!interactiveMode && (
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                className="inline-flex h-10 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3.5 text-sm font-medium whitespace-nowrap text-ink transition-colors hover:bg-surface-raised"
              >
                {playing ? (
                  <Pause className="h-4 w-4 text-accent" aria-hidden="true" />
                ) : (
                  <Play className="h-4 w-4 text-accent" aria-hidden="true" />
                )}
                {playing ? "Pause" : "Play"}
              </button>
            )}

            <button
              type="button"
              onClick={restart}
              className="inline-flex h-10 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3.5 text-sm font-medium whitespace-nowrap text-ink-secondary transition-colors hover:text-ink"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Restart
            </button>

            <button
              type="button"
              onClick={() => setRecordMode(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-md bg-accent px-3.5 text-sm font-semibold whitespace-nowrap text-accent-ink transition-colors hover:bg-accent-hover"
            >
              <Video className="h-4 w-4" aria-hidden="true" />
              Record mode
            </button>
          </div>
        </div>
      )}

      <div className="tyd-panel relative flex min-h-[540px] w-full max-w-6xl flex-col justify-between overflow-hidden bg-ground p-6 sm:aspect-video sm:p-10">
        <div className="flex items-center justify-between gap-4">
          <TydBaseLogo className="h-5 w-auto text-ink" />
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-ink-secondary">{currentScene.title}</span>
            <span className="tyd-tabular text-xs text-ink-muted">
              {sceneIndex + 1} / {SCENES.length}
            </span>
          </div>
        </div>

        <div className="my-auto py-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentScene.id}
              initial={{ opacity: 0.2, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0.2, y: -10 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12"
            >
              {sceneIndex === 0 && (
                <>
                  <div className="lg:col-span-5">
                    <h1 className="tyd-section-head font-semibold text-ink">
                      Database tooling is fragmented and exposed.
                    </h1>
                    <p className="mt-4 text-base leading-relaxed text-ink-secondary">
                      {currentScene.caption}
                    </p>
                  </div>

                  <div className="space-y-4 lg:col-span-7">
                    <div className="rounded-lg border border-line bg-surface p-4">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="text-ink-secondary">Local laptop memory footprint</span>
                        <span className="tyd-tabular font-medium text-danger">
                          {(ramUsedMb / 1000).toFixed(2)} GB RAM
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-well">
                        <motion.div
                          animate={{ scaleX: Math.min(1, ramUsedMb / 2800) }}
                          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                          style={{ transformOrigin: "left" }}
                          className="h-full w-full bg-danger"
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {SCENE_1_APPS.map((app, idx) => {
                          const visible = idx < visibleAppsCount;
                          return (
                            <motion.div
                              key={app.name}
                              animate={{ opacity: visible ? 1 : 0.2, y: visible ? 0 : 6 }}
                              transition={{ duration: 0.25 }}
                              className={`flex items-center justify-between rounded-md border px-3.5 py-2.5 text-xs ${
                                idx === 3
                                  ? "border-warn/50 bg-warn-tint/60 text-warn"
                                  : "border-line bg-surface-well text-ink-secondary"
                              }`}
                            >
                              <span className="font-medium">{app.name}</span>
                              <span className="tyd-tabular text-ink-muted">{app.memMb} MB</span>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>

                    <motion.div
                      animate={{ opacity: showSlackLeak ? 1 : 0.15, y: showSlackLeak ? 0 : 6 }}
                      transition={{ duration: 0.3 }}
                      className="rounded-md border border-danger/55 bg-danger-tint px-4 py-3 font-mono text-xs text-danger"
                    >
                      #ops-chat: &quot;Here is prod password -&gt;
                      postgres://admin:Prod992@10.0.4.12:5432/ledger&quot;
                    </motion.div>
                  </div>
                </>
              )}

              {sceneIndex === 1 && (
                <>
                  <div className="lg:col-span-5">
                    <h1 className="tyd-section-head font-semibold text-ink">
                      One browser tab for SQL, NoSQL, and vectors.
                    </h1>
                    <p className="mt-4 text-base leading-relaxed text-ink-secondary">
                      {currentScene.caption}
                    </p>
                  </div>

                  <div className="rounded-lg border border-line bg-surface lg:col-span-7">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-well px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {(
                          [
                            { id: "pgvector", label: "PostgreSQL + pgvector" },
                            { id: "mongodb", label: "MongoDB" },
                            { id: "redis", label: "Redis / Valkey" },
                          ] as const
                        ).map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveWorkspaceTab(tab.id)}
                            className={`rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                              activeWorkspaceTab === tab.id
                                ? "bg-accent-tint text-accent"
                                : "text-ink-secondary hover:text-ink"
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                      <span className="tyd-tabular text-xs text-accent">3.8 ms</span>
                    </div>

                    <div className="space-y-4 p-5">
                      {activeWorkspaceTab === "pgvector" && (
                        <>
                          <pre className="min-h-[5.5rem] rounded-md border border-line bg-surface-well p-3.5 font-mono text-xs leading-relaxed text-ink">
                            <code>
                              {visibleSql}
                              <span className="tyd-cursor ml-0.5" aria-hidden="true" />
                            </code>
                          </pre>

                          <div className="space-y-2.5">
                            {SCENE_2_ROWS.map((row, idx) => (
                              <motion.div
                                key={row.title}
                                animate={{
                                  opacity: showScene2Results ? 1 : 0.15,
                                  x: showScene2Results ? 0 : -8,
                                }}
                                transition={{ duration: 0.25, delay: idx * 0.08 }}
                                className="grid grid-cols-12 items-center gap-3 text-xs"
                              >
                                <span className="col-span-6 truncate text-ink">{row.title}</span>
                                <div className="col-span-4 h-1.5 overflow-hidden rounded-full bg-surface-well">
                                  <motion.div
                                    animate={{ scaleX: showScene2Results ? row.score : 0 }}
                                    transition={{ duration: 0.4, delay: idx * 0.08 }}
                                    style={{ transformOrigin: "left" }}
                                    className="h-full w-full bg-accent"
                                  />
                                </div>
                                <span className="col-span-2 text-right font-mono text-accent tyd-tabular">
                                  {row.score.toFixed(3)}
                                </span>
                              </motion.div>
                            ))}
                          </div>
                        </>
                      )}

                      {activeWorkspaceTab === "mongodb" && (
                        <pre className="rounded-md border border-line bg-surface-well p-4 font-mono text-xs leading-relaxed text-ink">
                          <code>{`db.sessions.aggregate([
  { $match: { active: true } },
  { $group: { _id: "$region", activeCount: { $sum: 1 } } }
])
// -> us-east-1: 412 | eu-central-1: 289 | ap-southeast-1: 164`}</code>
                        </pre>
                      )}

                      {activeWorkspaceTab === "redis" && (
                        <div className="space-y-2 font-mono text-xs text-ink-secondary">
                          <div className="flex justify-between border-b border-line pb-2 text-ink">
                            <span>mcp:oauth:tok:98f2</span>
                            <span className="text-accent">TTL 54m 08s</span>
                          </div>
                          <div className="flex justify-between border-b border-line pb-2 text-ink">
                            <span>relay:agent:vpc-prod-1</span>
                            <span className="text-accent">TTL 27s (heartbeat)</span>
                          </div>
                          <div className="flex justify-between text-ink">
                            <span>query:cache:northstar:44</span>
                            <span className="text-accent">TTL 9m 02s</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {sceneIndex === 2 && (
                <>
                  <div className="lg:col-span-5">
                    <h1 className="tyd-section-head font-semibold text-ink">
                      Private VPCs without opening firewall ports.
                    </h1>
                    <p className="mt-4 text-base leading-relaxed text-ink-secondary">
                      {currentScene.caption}
                    </p>
                  </div>

                  <div className="space-y-4 rounded-lg border border-line bg-surface p-5 lg:col-span-7">
                    <svg
                      viewBox="0 0 600 116"
                      className="h-auto w-full"
                      role="img"
                      aria-label="Animated outbound WSS/mTLS relay topology diagram"
                    >
                      <rect
                        x="6"
                        y="12"
                        width="210"
                        height="92"
                        rx="8"
                        fill="var(--color-surface-well)"
                        stroke="var(--color-accent)"
                      />
                      <text
                        x="22"
                        y="42"
                        fill="var(--color-ink)"
                        fontSize="13"
                        fontWeight="600"
                        fontFamily="var(--font-display)"
                      >
                        VPC / Localhost Agent
                      </text>
                      <text
                        x="22"
                        y="66"
                        fill="var(--color-accent)"
                        fontSize="11"
                        fontFamily="var(--font-mono)"
                      >
                        tydbase agent (0 open ports)
                      </text>
                      <text
                        x="22"
                        y="86"
                        fill="var(--color-ink-muted)"
                        fontSize="11"
                        fontFamily="var(--font-mono)"
                      >
                        10.0.4.12:5432, :6379
                      </text>

                      <line
                        x1="216"
                        y1="58"
                        x2="374"
                        y2="58"
                        stroke="var(--color-border-strong)"
                        strokeWidth="2"
                      />
                      <line
                        x1="216"
                        y1="58"
                        x2="374"
                        y2="58"
                        stroke="var(--color-accent)"
                        strokeWidth="3"
                        className="tyd-packet-line"
                      />
                      <text
                        x="295"
                        y="44"
                        textAnchor="middle"
                        fill="var(--color-accent)"
                        fontSize="11"
                        fontFamily="var(--font-body)"
                      >
                        Outbound WSS / mTLS
                      </text>

                      <rect
                        x="374"
                        y="12"
                        width="220"
                        height="92"
                        rx="8"
                        fill="var(--color-surface-raised)"
                        stroke="var(--color-border-strong)"
                      />
                      <text
                        x="390"
                        y="42"
                        fill="var(--color-ink)"
                        fontSize="13"
                        fontWeight="600"
                        fontFamily="var(--font-display)"
                      >
                        TydBase Control Plane
                      </text>
                      <text
                        x="390"
                        y="66"
                        fill="var(--color-ink-secondary)"
                        fontSize="11"
                        fontFamily="var(--font-body)"
                      >
                        Browser Workspace + OAuth MCP
                      </text>
                      <text
                        x="390"
                        y="86"
                        fill="var(--color-accent)"
                        fontSize="11"
                        fontFamily="var(--font-mono)"
                      >
                        Streamed encrypted rows
                      </text>
                    </svg>

                    <div className="space-y-1.5 border-t border-line pt-4 font-mono text-xs">
                      {SCENE_3_LOGS.map((line, idx) => {
                        const visible = idx < visibleLogCount;
                        return (
                          <motion.div
                            key={line}
                            animate={{ opacity: visible ? 1 : 0.15, x: visible ? 0 : -6 }}
                            transition={{ duration: 0.2 }}
                            className={idx === 0 ? "text-accent" : "text-ink-secondary"}
                          >
                            {line}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {sceneIndex === 3 && (
                <>
                  <div className="lg:col-span-5">
                    <h1 className="tyd-section-head font-semibold text-ink">
                      One governed MCP gateway for every AI agent.
                    </h1>
                    <p className="mt-4 text-base leading-relaxed text-ink-secondary">
                      {currentScene.caption}
                    </p>
                  </div>

                  <div className="space-y-4 rounded-lg border border-line bg-surface p-5 lg:col-span-7">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3 text-xs">
                      <span className="font-mono text-accent">
                        <Terminal className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />
                        https://mcp.tydbase.com/v1 (OAuth 2.1)
                      </span>
                      <button
                        type="button"
                        onClick={() => setManualMask(!isPiiMasked)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:border-accent"
                      >
                        {isPiiMasked ? (
                          <EyeOff className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                        ) : (
                          <Eye className="h-3.5 w-3.5 text-warn" aria-hidden="true" />
                        )}
                        WASM mask: {isPiiMasked ? "On" : "Off"}
                      </button>
                    </div>

                    <div className="flex items-center justify-between rounded-md border border-line bg-surface-well px-3.5 py-2.5 font-mono text-xs">
                      <span className="text-ink-secondary">execute_read_query -&gt; email</span>
                      <span className={isPiiMasked ? "text-accent" : "text-warn"}>
                        {isPiiMasked ? "r***@northstar.dev" : "ramiro@northstar.dev"}
                      </span>
                    </div>

                    <div className="font-mono text-xs text-ink">
                      claude-code -&gt; propose_mutation: DELETE FROM sessions WHERE expired_at &lt;
                      now();
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface-well p-3.5">
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
                        {gateState === "approved" && (
                          <>
                            <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />
                            Approved and written to audit log
                          </>
                        )}
                        {gateState === "rejected" && (
                          <>
                            <ShieldAlert className="h-4 w-4 text-danger" aria-hidden="true" />
                            Blocked before reaching production
                          </>
                        )}
                        {gateState === "pending" && (
                          <>
                            <ShieldAlert className="h-4 w-4 text-warn" aria-hidden="true" />
                            Paused for review (dry-run: 142 rows)
                          </>
                        )}
                      </span>

                      <div className="flex items-center gap-2">
                        {gateState === "pending" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setManualDecision("approved")}
                              className="inline-flex h-8 items-center gap-1 rounded-md bg-accent px-3 text-xs font-semibold text-accent-ink"
                            >
                              <Check className="h-3.5 w-3.5" aria-hidden="true" />
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => setManualDecision("rejected")}
                              className="inline-flex h-8 items-center rounded-md border border-danger/60 bg-danger-tint px-3 text-xs font-medium text-danger"
                            >
                              Block
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setManualDecision("pending")}
                            className="inline-flex h-8 items-center rounded-md border border-line-strong px-2.5 text-xs text-ink-secondary hover:text-ink"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {sceneIndex === 4 && (
                <div className="flex flex-col items-start gap-5 lg:col-span-12">
                  <TydBaseLogo className="h-8 w-auto text-ink" />
                  <h1 className="tyd-display max-w-3xl font-semibold text-ink">
                    Self-host for $0 forever, or run on TydBase Cloud.
                  </h1>
                  <p className="max-w-2xl text-lg text-ink-secondary">{currentScene.caption}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-4">
                    <Link href="/#waitlist" className="tyd-btn-primary">
                      <Database className="h-4 w-4" aria-hidden="true" />
                      Join beta at tydbase.blivius.com
                    </Link>
                    <button type="button" onClick={restart} className="tyd-btn-secondary">
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      Replay teaser
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-5 gap-2">
            {SCENES.map((scene, idx) => {
              const fill =
                idx < sceneIndex ? 1 : idx === sceneIndex ? Math.max(0.04, effectiveProgress) : 0;
              return (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => goToScene(idx)}
                  aria-label={`Jump to scene ${idx + 1}: ${scene.title}`}
                  className="h-1.5 overflow-hidden rounded-full bg-line"
                >
                  <div
                    className="h-full w-full bg-accent"
                    style={{ transform: `scaleX(${fill})`, transformOrigin: "left" }}
                  />
                </button>
              );
            })}
          </div>

          {!recordMode && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => goToScene(sceneIndex - 1)}
                  className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 text-ink-secondary hover:border-line-strong hover:text-ink"
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => goToScene(sceneIndex + 1)}
                  className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 text-ink-secondary hover:border-line-strong hover:text-ink"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
              <span>Space: play/pause | Left/Right: switch scene | H: toggle Record mode</span>
            </div>
          )}
        </div>
      </div>

      {recordMode && (
        <button
          type="button"
          onClick={() => setRecordMode(false)}
          className="mt-3 text-xs text-ink-muted opacity-40 transition-opacity hover:opacity-100"
        >
          Exit record mode (H)
        </button>
      )}
    </div>
  );
}
