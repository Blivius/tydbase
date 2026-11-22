"use client";

import { readWaitlistResponse } from "@/lib/waitlist-response";
import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";

const DATABASE_OPTIONS = [
  "PostgreSQL",
  "MySQL / MariaDB",
  "MongoDB",
  "Redis / Valkey",
  "pgvector / Qdrant",
  "SQLite / LibSQL",
  "SQL Server",
];

const AI_TOOL_OPTIONS = ["Claude Code / Desktop", "OpenAI Codex / ChatGPT", "Gemini CLI", "Cursor"];

function toggleListItem(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [databases, setDatabases] = useState<string[]>(["PostgreSQL", "Redis / Valkey"]);
  const [aiTools, setAiTools] = useState<string[]>(["Claude Code / Desktop"]);
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      setState("error");
      setMessage("Enter an email address to join the private beta.");
      return;
    }

    setState("submitting");
    setMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          role: role.trim() || undefined,
          databases,
          aiTools,
          source: "waitlist-full-form",
        }),
      });
      const data = await readWaitlistResponse(res);
      if (!res.ok || !data.ok) {
        setState("error");
        setMessage(data.message ?? "Could not save your signup right now.");
        return;
      }
      setState("success");
      setMessage(data.message ?? "You are on the TydBase private beta list.");
      setEmail("");
    } catch {
      setState("error");
      setMessage("Network error while sending your signup. Try again.");
    }
  }

  async function handleCopyShareUrl() {
    try {
      await navigator.clipboard.writeText("https://tydbase.blivius.com");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section id="waitlist" className="bg-surface-well" style={{ paddingBlock: "var(--space-12)" }}>
      <div className="tyd-container grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2 className="tyd-section-head font-semibold text-ink">
            Join the private beta and shape V1.
          </h2>
          <p className="mt-4 max-w-[46ch] text-lg leading-relaxed text-ink-secondary">
            Tell us which databases and AI tools your team uses every day. We are onboarding early
            beta teams in batches and prioritizing the engines our first users actually run.
          </p>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleCopyShareUrl()}
              className="tyd-btn-secondary"
            >
              {copied ? (
                <Check className="h-4 w-4 text-accent" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4 text-ink-secondary" aria-hidden="true" />
              )}
              {copied ? "Copied link" : "Share tydbase.blivius.com"}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="tyd-panel space-y-6 p-7 lg:col-span-7" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="waitlist-email" className="mb-2 block text-sm font-medium text-ink">
                Email address
              </label>
              <input
                id="waitlist-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@team.dev"
                disabled={state === "submitting"}
                className="tyd-input"
              />
            </div>

            <div>
              <label htmlFor="waitlist-role" className="mb-2 block text-sm font-medium text-ink">
                Role or team size (optional)
              </label>
              <input
                id="waitlist-role"
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Backend lead, 8 engineers"
                disabled={state === "submitting"}
                className="tyd-input"
              />
            </div>
          </div>

          <fieldset>
            <legend className="mb-2.5 text-sm font-medium text-ink">
              Databases you connect to most
            </legend>
            <div className="flex flex-wrap gap-2">
              {DATABASE_OPTIONS.map((db) => {
                const active = databases.includes(db);
                return (
                  <button
                    key={db}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDatabases((prev) => toggleListItem(prev, db))}
                    className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "border-accent bg-accent-tint text-accent"
                        : "border-line text-ink-secondary hover:border-line-strong hover:text-ink"
                    }`}
                  >
                    {db}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2.5 text-sm font-medium text-ink">
              AI tools you want wired via MCP
            </legend>
            <div className="flex flex-wrap gap-2">
              {AI_TOOL_OPTIONS.map((tool) => {
                const active = aiTools.includes(tool);
                return (
                  <button
                    key={tool}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setAiTools((prev) => toggleListItem(prev, tool))}
                    className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "border-accent bg-accent-tint text-accent"
                        : "border-line text-ink-secondary hover:border-line-strong hover:text-ink"
                    }`}
                  >
                    {tool}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p
              role="status"
              aria-live="polite"
              className={`min-h-[1.5rem] text-sm ${
                state === "error"
                  ? "text-danger"
                  : state === "success"
                    ? "text-accent"
                    : "text-ink-muted"
              }`}
            >
              {message || "Only beta invites and release notes. Unsubscribe anytime."}{" "}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">
                Privacy
              </Link>
            </p>
            <button
              type="submit"
              disabled={state === "submitting"}
              className="tyd-btn-primary shrink-0"
            >
              {state === "submitting" ? "Submitting…" : "Request beta invite"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
