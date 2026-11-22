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

async function upsertLoopsContact(
  apiKey: string,
  payload: z.infer<typeof waitlistSchema>
): Promise<{ alreadyJoined: boolean }> {
  const normalizedEmail = payload.email.toLowerCase();
  const mailingListId = process.env.LOOPS_MAILING_LIST_ID?.trim();

  const body: Record<string, unknown> = {
    email: normalizedEmail,
    source: payload.source ?? "tydbase.blivius.com",
    userGroup: "beta-waitlist",
    subscribed: true,
  };

  if (payload.role) {
    body.role = payload.role;
  }
  if (payload.databases && payload.databases.length > 0) {
    body.databases = payload.databases.join(", ");
  }
  if (payload.aiTools && payload.aiTools.length > 0) {
    body.aiTools = payload.aiTools.join(", ");
  }
  if (mailingListId) {
    body.mailingLists = { [mailingListId]: true };
  }

  // First try create so we can tell new signups apart from returning contacts cleanly.
  const createRes = await fetch("https://app.loops.so/api/v1/contacts/create", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (createRes.ok) {
    return { alreadyJoined: false };
  }

  // 409 means contact already exists in Loops -> upsert their stack preferences.
  if (createRes.status === 409) {
    const updateRes = await fetch("https://app.loops.so/api/v1/contacts/update", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      throw new Error(`Loops update failed (${updateRes.status}): ${errText}`);
    }
    return { alreadyJoined: true };
  }

  const errText = await createRes.text();
  throw new Error(`Loops create failed (${createRes.status}): ${errText}`);
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

  const loopsApiKey = process.env.LOOPS_API_KEY?.trim();

  try {
    if (loopsApiKey) {
      const result = await upsertLoopsContact(loopsApiKey, parsed.data);
      return NextResponse.json(
        {
          ok: true,
          alreadyJoined: result.alreadyJoined,
          provider: "loops",
          message: result.alreadyJoined
            ? "You are already on the beta list. Your preferences were updated."
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
