import { posthog } from "posthog-js";

export type AnalyticsEvent =
  | "demo_approved"
  | "demo_rejected"
  | "signup_email"
  | "signup_details"
  | "signup_skipped"
  | "github_click";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
const REGION = process.env.NEXT_PUBLIC_POSTHOG_REGION?.trim() === "eu" ? "eu" : "us";

/** The channel tag from ?ref= (hn, reddit-pg, x...), so signups and events show where people came from. */
export function referrerTag(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const ref = new URLSearchParams(window.location.search).get("ref")?.toLowerCase();
  return ref && /^[a-z0-9-]{1,30}$/.test(ref) ? ref : undefined;
}

let started = false;

/**
 * Starts PostHog without cookies or storage (cookieless_mode also has to be switched on in the
 * PostHog project settings). Events go through the same-origin /ingest proxy in next.config.ts.
 * With no NEXT_PUBLIC_POSTHOG_KEY nothing loads.
 */
export function startAnalytics() {
  if (started || !KEY) return;
  started = true;
  posthog.init(KEY, {
    api_host: "/ingest",
    ui_host: `https://${REGION}.posthog.com`,
    cookieless_mode: "always",
    capture_pageview: true,
    autocapture: false,
    disable_session_recording: true,
  });
  const ref = referrerTag();
  if (ref) posthog.register({ ref });
}

export function track(event: AnalyticsEvent, properties?: Record<string, string | number>) {
  if (started) posthog.capture(event, properties);
}
