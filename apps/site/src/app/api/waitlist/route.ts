import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  joinWithResend,
  type ResendConfig,
  saveDetails,
  TEAM_SIZES,
  type WaitlistDetails,
  type WaitlistSignup,
} from "./resend";

// Step 1 sends { email, source }. Step 2 sends { email, teamSize?, worry? } for the same address.
const waitlistSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter an email address like name@company.com."),
  source: z.string().trim().max(60).optional(),
  teamSize: z.enum(TEAM_SIZES, { message: "Pick one of the team sizes." }).optional(),
  worry: z
    .string()
    .trim()
    .max(1000, "Keep it under 1,000 characters.")
    .transform((v) => v || undefined)
    .optional(),
});

// ---- Rate limiting --------------------------------------------------------------------------
// ponytail: per-instance memory limiter. On Vercel every instance keeps its own map; add a Vercel
// Firewall rate-limit rule if signups get abused.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 10;
const RATE_TRACKED_IPS_MAX = 5_000;
const ipHits = new Map<string, number[]>();

function isRateLimited(ip: string, now = Date.now()): boolean {
  if (ipHits.size > RATE_TRACKED_IPS_MAX) {
    for (const [key, hits] of ipHits) {
      if (now - (hits.at(-1) ?? 0) >= RATE_WINDOW_MS) ipHits.delete(key);
    }
  }
  const recent = (ipHits.get(ip) ?? []).filter((ts) => now - ts < RATE_WINDOW_MS);
  const limited = recent.length >= RATE_MAX_REQUESTS;
  if (!limited) recent.push(now);
  ipHits.set(ip, recent);
  return limited;
}

// Vercel sets x-real-ip to the connecting client and overwrites any value the client sent.
// X-Forwarded-For is client-controlled and deliberately ignored.
function clientIp(request: Request): string {
  return request.headers.get("x-real-ip")?.trim() || "local";
}

// ---- Config -----------------------------------------------------------------------------------
const env = (name: string) => process.env[name]?.trim() || undefined;

function resendConfig(): ResendConfig | null {
  const apiKey = env("RESEND_API_KEY");
  if (!apiKey) return null;
  return {
    apiKey,
    fromEmail: env("RESEND_FROM_EMAIL"),
    notifyEmail: env("RESEND_NOTIFY_EMAIL"),
    replyTo: env("RESEND_REPLY_TO"),
    segmentId: env("RESEND_SEGMENT_ID"),
  };
}

let configWarned = false;
function warnOnPartialConfig(config: ResendConfig) {
  if (configWarned || config.fromEmail) return;
  configWarned = true;
  console.warn(
    "[waitlist] RESEND_FROM_EMAIL is empty: contacts are saved but no confirmation" +
      (config.notifyEmail ? " or RESEND_NOTIFY_EMAIL alert" : "") +
      " is sent. Set it to an address on your verified Resend domain."
  );
}

// ---- Local dev store (never used in production) -----------------------------------------------
const localEntrySchema = z.object({
  email: z.string(),
  source: z.string(),
  teamSize: z.string().optional(),
  worry: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
type LocalEntry = z.infer<typeof localEntrySchema>;

async function upsertLocalEntry(
  signup: WaitlistSignup & Omit<WaitlistDetails, "email">
): Promise<{ alreadyJoined: boolean }> {
  const filePath = path.join(process.cwd(), ".waitlist-dev.json");
  let entries: LocalEntry[] = [];
  if (existsSync(filePath)) {
    try {
      const stored = z
        .array(localEntrySchema)
        .safeParse(JSON.parse(await readFile(filePath, "utf8")));
      if (stored.success) entries = stored.data;
    } catch {
      entries = [];
    }
  }

  const now = new Date().toISOString();
  const existing = entries.find((entry) => entry.email === signup.email);
  if (existing) {
    existing.teamSize = signup.teamSize ?? existing.teamSize;
    existing.worry = signup.worry ?? existing.worry;
    existing.updatedAt = now;
  } else {
    entries.push({
      email: signup.email,
      source: signup.source ?? "tydbase-waitlist",
      teamSize: signup.teamSize,
      worry: signup.worry,
      createdAt: now,
      updatedAt: now,
    });
  }
  await writeFile(filePath, JSON.stringify(entries, null, 2), "utf8");
  return { alreadyJoined: existing !== undefined };
}

// ---- Handler ----------------------------------------------------------------------------------
export async function POST(request: Request) {
  if (isRateLimited(clientIp(request))) {
    return NextResponse.json(
      { ok: false, message: "Too many attempts. Wait a minute and try again." },
      { status: 429 }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON request body." }, { status: 400 });
  }
  const parsed = waitlistSchema.safeParse(rawBody);
  if (!parsed.success) {
    const issueMessage = parsed.error.issues[0]?.message ?? "Please check your email address.";
    return NextResponse.json({ ok: false, message: issueMessage }, { status: 400 });
  }

  const config = resendConfig();
  if (!config && process.env.NODE_ENV === "production") {
    // Fail closed: a production signup must never land in a file that disappears with the container.
    console.error("[waitlist] RESEND_API_KEY is not set in production; refusing signups (503).");
    return NextResponse.json(
      { ok: false, message: "Signups are paused for a moment. Try again shortly." },
      { status: 503 }
    );
  }

  const { email, source, teamSize, worry } = parsed.data;
  const isDetails = teamSize !== undefined || worry !== undefined;
  const provider = config ? "resend" : "local-dev";

  try {
    if (isDetails) {
      if (config) await saveDetails(config, { email, teamSize, worry });
      else await upsertLocalEntry({ email, teamSize, worry });
      return NextResponse.json(
        { ok: true, provider, message: "Thanks. We read every answer." },
        { status: 200 }
      );
    }

    let alreadyJoined: boolean;
    if (config) {
      warnOnPartialConfig(config);
      ({ alreadyJoined } = await joinWithResend(config, { email, source }));
    } else {
      ({ alreadyJoined } = await upsertLocalEntry({ email, source }));
    }
    return NextResponse.json(
      {
        ok: true,
        alreadyJoined,
        provider,
        message: alreadyJoined
          ? "You're already on the list."
          : config?.fromEmail
            ? "You're on the list. A confirmation email is on its way."
            : "You're on the list.",
      },
      { status: alreadyJoined ? 200 : 201 }
    );
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    return NextResponse.json(
      { ok: false, message: "Could not record your signup right now. Try again shortly." },
      { status: 500 }
    );
  }
}
