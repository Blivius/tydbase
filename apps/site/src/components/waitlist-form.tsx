"use client";

import { type FormEvent, useId, useRef, useState } from "react";
import { referrerTag, track } from "@/lib/analytics";
import { BOOKING_URL } from "@/lib/links";
import { readWaitlistResponse } from "@/lib/waitlist-response";

const TEAM_SIZES = [
  { value: "solo", label: "Just me" },
  { value: "2-10", label: "2 to 10" },
  { value: "11-50", label: "11 to 50" },
  { value: "50+", label: "50 or more" },
] as const;

type Step = "email" | "details" | "done";

async function post(body: Record<string, string>) {
  const res = await fetch("/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { res, data: await readWaitlistResponse(res) };
}

const NETWORK_ERROR = "That didn't go through. Check your connection and try again.";

/**
 * Two steps: the email alone (the commitment), then optional team size and worry. Answering
 * step 2 never blocks step 1's signup, which is already saved by then.
 */
export function WaitlistForm({
  source,
  wide = false,
}: {
  source: "hero" | "close";
  wide?: boolean;
}) {
  const width = wide ? "w-full" : "w-full max-w-xl";
  const id = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [worry, setWorry] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = emailRef.current;
    if (!input?.checkValidity() || !email.trim()) {
      setIsError(true);
      setMessage("Enter an email address like name@company.com.");
      input?.focus();
      return;
    }
    setBusy(true);
    setIsError(false);
    setMessage("");
    try {
      const ref = referrerTag();
      const { res, data } = await post({
        email: email.trim(),
        source: ref ? `${source}?ref=${ref}` : source,
      });
      if (!res.ok || !data.ok) {
        setIsError(true);
        setMessage(data.message ?? NETWORK_ERROR);
        input.focus();
        return;
      }
      track("signup_email", { source });
      setIsError(false);
      setMessage(data.message ?? "You're on the list.");
      setStep("details");
    } catch {
      setIsError(true);
      setMessage(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  }

  async function submitDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!teamSize && !worry.trim()) {
      skip();
      return;
    }
    setBusy(true);
    try {
      const { res, data } = await post({
        email: email.trim(),
        ...(teamSize ? { teamSize } : {}),
        ...(worry.trim() ? { worry: worry.trim() } : {}),
      });
      if (!res.ok || !data.ok) {
        setIsError(true);
        setMessage(data.message ?? NETWORK_ERROR);
        return;
      }
      track("signup_details", { teamSize: teamSize || "none", wroteWorry: worry.trim() ? 1 : 0 });
      setIsError(false);
      setMessage(data.message ?? "Thanks. We read every answer.");
      setStep("done");
    } catch {
      setIsError(true);
      setMessage(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  }

  function skip() {
    track("signup_skipped");
    setIsError(false);
    setMessage("You're on the list. Watch for the invite in your inbox.");
    setStep("done");
  }

  const status = (
    <p
      id={`${id}-status`}
      role="status"
      aria-live="polite"
      className={`min-h-[1lh] ${
        isError
          ? "text-sm text-danger"
          : step === "done"
            ? "text-ink"
            : "text-sm text-ink-secondary"
      }`}
    >
      {message}
    </p>
  );

  if (step === "email") {
    return (
      <form onSubmit={submitEmail} noValidate className={`flex flex-col gap-2 ${width}`}>
        <label htmlFor={`${id}-email`} className="text-sm text-ink-secondary">
          Work email
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            ref={emailRef}
            id={`${id}-email`}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            aria-invalid={isError || undefined}
            aria-describedby={`${id}-status`}
            className="tyd-input min-w-0 sm:flex-1"
          />
          <button type="submit" disabled={busy} aria-busy={busy} className="tyd-btn-primary">
            {busy ? "Joining…" : "Join the beta"}
          </button>
        </div>
        {status}
      </form>
    );
  }

  if (step === "details") {
    return (
      <form onSubmit={submitDetails} noValidate className={`flex flex-col gap-4 ${width}`}>
        {status}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm text-ink">How big is your team? (optional)</legend>
          <div className="flex flex-wrap gap-2">
            {TEAM_SIZES.map((size) => (
              <label key={size.value} className="tyd-choice">
                <input
                  type="radio"
                  name="teamSize"
                  value={size.value}
                  checked={teamSize === size.value}
                  onChange={() => setTeamSize(size.value)}
                />
                <span>{size.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-worry`} className="text-sm text-ink">
            What does your team&apos;s agent touch, and what worries you? (optional)
          </label>
          <textarea
            id={`${id}-worry`}
            name="worry"
            rows={3}
            maxLength={1000}
            value={worry}
            onChange={(e) => setWorry(e.target.value)}
            placeholder="Claude Code runs migrations against our staging Postgres…"
            className="tyd-input tyd-textarea"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} aria-busy={busy} className="tyd-btn-secondary">
            {busy ? "Sending…" : "Send answers"}
          </button>
          <button type="button" onClick={skip} disabled={busy} className="tyd-btn-text">
            Skip
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${width}`}>
      {status}
      <p className="text-sm text-ink-secondary">
        Easier to explain on a call?{" "}
        <a
          href={BOOKING_URL}
          target="_blank"
          rel="noopener"
          onClick={() => track("call_click", { source })}
          className="tyd-link"
        >
          Book 20 minutes with the founder
        </a>
        .
      </p>
    </div>
  );
}
