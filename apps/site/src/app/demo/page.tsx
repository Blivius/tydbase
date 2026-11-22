"use client";

import { TydBaseLogo } from "@tydbase/ui";
import {
  ArrowLeft,
  Check,
  Database,
  EyeOff,
  GlobeLock,
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
import { useCallback, useEffect, useState } from "react";

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
    durationMs: 11_000,
    caption:
      "Four local DB apps, staging passwords pasted in Slack, and AI agents holding raw credentials in mcp.json.",
  },
  {
    id: 1,
    title: "One browser workspace",
    durationMs: 12_000,
    caption:
      "TydBase unifies PostgreSQL (+ pgvector), MySQL, MongoDB, and Redis in one zero-install browser tab.",
  },
  {
    id: 2,
    title: "Private VPC and localhost relay",
    durationMs: 13_000,
    caption:
      "One Go binary dials outbound over WSS/mTLS from your VPC or laptop. Zero open firewall ports.",
  },
  {
    id: 3,
    title: "Governed MCP for every AI client",
    durationMs: 14_000,
    caption:
      "Claude, Codex, Gemini, and Cursor connect via OAuth. WASM redacts PII; production writes wait for approval.",
  },
  {
    id: 4,
    title: "Self-host free or use Cloud",
    durationMs: 10_000,
    caption:
      "Apache-2.0 self-hosting at $0 forever, or managed TydBase Cloud. Join the beta at tydbase.blivius.com.",
  },
];

export default function DemoPage() {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [recordMode, setRecordMode] = useState(false);
  const [approvedScene, setApprovedScene] = useState<number | null>(null);

  const currentScene = SCENES[sceneIndex] ?? SCENES[0]!;
  const approvedInScene = sceneIndex === 3 && approvedScene === 3;

  const restart = useCallback(() => {
    setSceneIndex(0);
    setApprovedScene(null);
    setPlaying(true);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === " ") {
        event.preventDefault();
        setPlaying((p) => !p);
      } else if (event.key.toLowerCase() === "h") {
        setRecordMode((r) => !r);
      } else if (event.key === "ArrowRight") {
        setSceneIndex((idx) => (idx + 1) % SCENES.length);
      } else if (event.key === "ArrowLeft") {
        setSceneIndex((idx) => (idx - 1 + SCENES.length) % SCENES.length);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const approveTimer =
      sceneIndex === 3 ? window.setTimeout(() => setApprovedScene(3), 7000) : undefined;

    const nextTimer = window.setTimeout(() => {
      if (sceneIndex < SCENES.length - 1) {
        setSceneIndex((prev) => prev + 1);
      } else {
        setPlaying(false);
      }
    }, currentScene.durationMs);

    return () => {
      window.clearTimeout(nextTimer);
      if (approveTimer) window.clearTimeout(approveTimer);
    };
  }, [sceneIndex, playing, currentScene.durationMs]);

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
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="inline-flex h-10 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3.5 text-sm font-medium text-ink transition-colors hover:bg-surface-raised"
            >
              {playing ? (
                <Pause className="h-4 w-4 text-accent" aria-hidden="true" />
              ) : (
                <Play className="h-4 w-4 text-accent" aria-hidden="true" />
              )}
              {playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              onClick={restart}
              className="inline-flex h-10 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3.5 text-sm font-medium text-ink-secondary transition-colors hover:text-ink"
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

      <div className="tyd-panel relative flex aspect-video w-full max-w-6xl flex-col justify-between overflow-hidden bg-ground p-8 sm:p-12">
        <div className="flex items-center justify-between">
          <TydBaseLogo className="h-5 w-auto text-ink" />
          <span className="tyd-tabular text-xs text-ink-muted">
            Scene {sceneIndex + 1} of {SCENES.length}
          </span>
        </div>

        <div className="my-auto py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScene.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
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
                  <div className="space-y-3 font-mono text-xs lg:col-span-7">
                    <div className="rounded-md border border-danger/45 bg-danger-tint/70 p-4 text-danger">
                      #engineering-ops: postgres://admin:ProdPass_992@10.0.4.12:5432/ledger
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-ink-secondary">
                      <div className="rounded-md border border-line bg-surface p-3.5">
                        DataGrip.app (1.4 GB RAM)
                      </div>
                      <div className="rounded-md border border-line bg-surface p-3.5">
                        MongoDB Compass (680 MB RAM)
                      </div>
                      <div className="rounded-md border border-line bg-surface p-3.5">
                        RedisInsight (510 MB RAM)
                      </div>
                      <div className="rounded-md border border-warn/45 bg-warn-tint/70 p-3.5 text-warn">
                        ~/.claude/mcp.json (raw prod key)
                      </div>
                    </div>
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
                  <div className="rounded-lg border border-line bg-surface p-5 lg:col-span-7">
                    <div className="mb-4 flex flex-wrap gap-2 text-xs font-medium">
                      <span className="rounded-md bg-accent-tint px-3 py-1 text-accent">
                        PostgreSQL + pgvector
                      </span>
                      <span className="rounded-md bg-surface-raised px-3 py-1 text-ink-secondary">
                        MongoDB
                      </span>
                      <span className="rounded-md bg-surface-raised px-3 py-1 text-ink-secondary">
                        Redis / Valkey
                      </span>
                      <span className="rounded-md bg-surface-raised px-3 py-1 text-ink-secondary">
                        MySQL / MariaDB
                      </span>
                    </div>
                    <pre className="font-mono text-xs leading-relaxed text-ink">
                      <code>{`SELECT title, dims, cosine_score
FROM ai_documents
ORDER BY cosine_score DESC LIMIT 3;`}</code>
                    </pre>
                    <div className="mt-4 border-t border-line pt-3 font-mono text-xs text-accent">
                      3 rows returned in 4.2 ms (read-only transaction)
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
                  <div className="rounded-lg border border-line bg-surface p-6 font-mono text-xs lg:col-span-7">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="rounded-md border border-accent/50 bg-accent-tint px-4 py-3 text-accent">
                        <GlobeLock className="mb-1.5 h-4 w-4" aria-hidden="true" />
                        tydbase agent (VPC / localhost)
                      </div>
                      <div className="tyd-relay-pulse text-ink-secondary">
                        outbound WSS / mTLS ---&gt;
                      </div>
                      <div className="rounded-md border border-line-strong bg-surface-well px-4 py-3 text-ink">
                        <Database className="mb-1.5 h-4 w-4 text-accent" aria-hidden="true" />
                        TydBase Control Plane
                      </div>
                    </div>
                    <p className="mt-5 border-t border-line pt-4 text-ink-secondary">
                      $ tydbase agent --token tb_agt_vpc_prod
                      <br />
                      Connected cleanly. Inbound ports exposed: 0.
                    </p>
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
                      <span className="inline-flex items-center gap-1.5 text-ink-secondary">
                        <EyeOff className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                        WASM PII mask active: r***@northstar.dev
                      </span>
                    </div>
                    <div className="font-mono text-xs text-ink">
                      claude-code -&gt; propose_mutation: DELETE FROM sessions WHERE expired_at &lt;
                      now();
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-line bg-surface-well p-3.5">
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
                        {approvedInScene ? (
                          <>
                            <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />
                            Approved by teammate and logged to audit trail
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="h-4 w-4 text-warn" aria-hidden="true" />
                            Paused for human review (dry-run: 142 rows)
                          </>
                        )}
                      </span>
                      {approvedInScene && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-accent-tint px-2.5 py-1 text-xs font-medium text-accent">
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          Committed
                        </span>
                      )}
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
                  <div className="mt-2 font-mono text-base text-accent">tydbase.blivius.com</div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-5 gap-2">
            {SCENES.map((scene, idx) => (
              <button
                key={scene.id}
                type="button"
                onClick={() => setSceneIndex(idx)}
                aria-label={`Jump to scene ${idx + 1}: ${scene.title}`}
                className={`h-1.5 rounded-full transition-colors ${
                  idx <= sceneIndex ? "bg-accent" : "bg-line"
                }`}
              />
            ))}
          </div>
          {!recordMode && (
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>{currentScene.title}</span>
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
