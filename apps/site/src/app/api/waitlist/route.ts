import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";

const waitlistSchema = z.object({
  email: z.string().trim().email("Enter a valid work or personal email address."),
  role: z.string().trim().max(80).optional(),
  databases: z.array(z.string().trim().max(40)).max(10).optional(),
  aiTools: z.array(z.string().trim().max(40)).max(10).optional(),
  source: z.string().trim().max(60).optional(),
});

interface LocalWaitlistEntry {
  email: string;
  role?: string;
  databases: string[];
  aiTools: string[];
  source: string;
  createdAt: string;
  updatedAt: string;
}

const RESEND_TIMEOUT_MS = 30_000;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 10;
const ipHits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (ipHits.get(ip) ?? []).filter((ts) => now - ts < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX_REQUESTS) {
    ipHits.set(ip, recent);
    return true;
  }
  recent.push(now);
  ipHits.set(ip, recent);
  return false;
}

function getLocalStorePath(): string {
  return path.join(process.cwd(), ".waitlist-dev.json");
}

async function upsertLocalEntry(
  payload: z.infer<typeof waitlistSchema>
): Promise<{ alreadyJoined: boolean }> {
  const filePath = getLocalStorePath();
  let entries: LocalWaitlistEntry[] = [];

  if (existsSync(filePath)) {
    try {
      const raw = await readFile(filePath, "utf8");
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        entries = parsed as LocalWaitlistEntry[];
      }
    } catch {
      entries = [];
    }
  }

  const normalizedEmail = payload.email.toLowerCase();
  const nowIso = new Date().toISOString();
  const existingIdx = entries.findIndex((item) => item.email === normalizedEmail);

  if (existingIdx >= 0) {
    const existing = entries[existingIdx];
    if (existing) {
      entries[existingIdx] = {
        ...existing,
        role: payload.role ?? existing.role,
        databases:
          payload.databases && payload.databases.length > 0
            ? payload.databases
            : existing.databases,
        aiTools: payload.aiTools && payload.aiTools.length > 0 ? payload.aiTools : existing.aiTools,
        updatedAt: nowIso,
      };
    }
    await writeFile(filePath, JSON.stringify(entries, null, 2), "utf8");
    return { alreadyJoined: true };
  }

  entries.push({
    email: normalizedEmail,
    role: payload.role,
    databases: payload.databases ?? [],
    aiTools: payload.aiTools ?? [],
    source: payload.source ?? "tydbase-waitlist",
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  await writeFile(filePath, JSON.stringify(entries, null, 2), "utf8");
  return { alreadyJoined: false };
}

async function saveResendWaitlistContact(
  apiKey: string,
  payload: z.infer<typeof waitlistSchema>
): Promise<{ alreadyJoined: boolean; contactId?: string }> {
  const normalizedEmail = payload.email.toLowerCase();
  const audienceId = process.env.RESEND_AUDIENCE_ID?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  const notifyEmail = process.env.RESEND_NOTIFY_EMAIL?.trim();

  const endpoint = audienceId
    ? `https://api.resend.com/audiences/${encodeURIComponent(audienceId)}/contacts`
    : "https://api.resend.com/contacts";

  const contactRes = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: normalizedEmail,
      first_name: payload.role?.slice(0, 60) || undefined,
      unsubscribed: false,
    }),
    signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
  });

  let alreadyJoined = false;
  let contactId: string | undefined;

  if (contactRes.ok) {
    const data = (await contactRes.json()) as { id?: string };
    contactId = data.id;
  } else if (contactRes.status === 409) {
    alreadyJoined = true;
  } else {
    const errBody = await contactRes.text();
    throw new Error(`Resend contact error (${contactRes.status}): ${errBody}`);
  }

  // Send a concise beta confirmation email when a verified sender address is configured.
  if (fromEmail && !alreadyJoined) {
    const stackLines = [
      payload.role ? `Role: ${payload.role}` : null,
      payload.databases && payload.databases.length > 0
        ? `Databases: ${payload.databases.join(", ")}`
        : null,
      payload.aiTools && payload.aiTools.length > 0
        ? `AI clients: ${payload.aiTools.join(", ")}`
        : null,
    ].filter(Boolean);

    const confirmText = [
      "You are on the TydBase private beta waitlist.",
      "",
      "We are onboarding early teams in batches at tydbase.blivius.com and prioritizing the database engines and MCP workflows requested most.",
      ...(stackLines.length > 0 ? ["", ...stackLines] : []),
      "",
      "Self-hosted TydBase stays Apache-2.0 and free forever.",
      "TydBase / Blivius HQ",
    ].join("\n");

    const confirmRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `tydbase-waitlist-${normalizedEmail}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [normalizedEmail],
        subject: "You are on the TydBase private beta list",
        text: confirmText,
      }),
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    });

    if (!confirmRes.ok) {
      const errBody = await confirmRes.text();
      console.error(`[resend] Confirmation email failed (${confirmRes.status}): ${errBody}`);
    }

    if (notifyEmail) {
      const notifyRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `tydbase-waitlist-notify-${normalizedEmail}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [notifyEmail],
          subject: `New TydBase beta signup: ${normalizedEmail}`,
          text: [
            `Email: ${normalizedEmail}`,
            `Source: ${payload.source ?? "tydbase.blivius.com"}`,
            ...stackLines,
          ].join("\n"),
        }),
        signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
      });

      if (!notifyRes.ok) {
        const errBody = await notifyRes.text();
        console.error(`[resend] Founder notify email failed (${notifyRes.status}): ${errBody}`);
      }
    }
  }

  return { alreadyJoined, contactId };
}

export async function POST(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const clientIp = forwarded?.split(",")[0]?.trim() || "local";

  if (isRateLimited(clientIp)) {
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

  const resendApiKey = process.env.RESEND_API_KEY?.trim();

  try {
    if (resendApiKey) {
      const result = await saveResendWaitlistContact(resendApiKey, parsed.data);
      return NextResponse.json(
        {
          ok: true,
          alreadyJoined: result.alreadyJoined,
          provider: "resend",
          message: result.alreadyJoined
            ? "You are already on the TydBase beta list."
            : "Added to the TydBase private beta waitlist.",
        },
        { status: result.alreadyJoined ? 200 : 201 }
      );
    }

    const result = await upsertLocalEntry(parsed.data);
    return NextResponse.json(
      {
        ok: true,
        alreadyJoined: result.alreadyJoined,
        provider: "local-dev",
        message: result.alreadyJoined
          ? "Already saved on the local beta list. Preferences updated."
          : "Saved to the local beta waitlist.",
      },
      { status: result.alreadyJoined ? 200 : 201 }
    );
  } catch (err) {
    console.error("Waitlist submission error:", err);
    return NextResponse.json(
      { ok: false, message: "Could not record your signup right now. Try again shortly." },
      { status: 500 }
    );
  }
}
