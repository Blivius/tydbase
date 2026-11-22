import { z } from "zod";

// Resend REST client for the waitlist: one contact per signup (global contact, optional segment,
// answers as contact properties) plus a confirmation email and a notification to the team.

const RESEND_API = "https://api.resend.com";
const RESEND_TIMEOUT_MS = 8_000;

export interface WaitlistSignup {
  email: string;
  role?: string | undefined;
  databases?: string[] | undefined;
  aiTools?: string[] | undefined;
  source?: string | undefined;
}

export interface ResendConfig {
  apiKey: string;
  fromEmail?: string | undefined;
  notifyEmail?: string | undefined;
  replyTo?: string | undefined;
  segmentId?: string | undefined;
}

const resendErrorSchema = z.object({ name: z.string().optional(), message: z.string().optional() });

// What to do about each Resend error name we have hit or can expect. Shown in server logs only.
const RESEND_HINTS: Record<string, string> = {
  restricted_api_key:
    "RESEND_API_KEY can only send emails. Create a Full access key in Resend → API Keys.",
  invalid_api_key: "RESEND_API_KEY is wrong or revoked. Create a new key in Resend → API Keys.",
  missing_api_key: "RESEND_API_KEY is empty.",
  validation_error:
    "Check that RESEND_FROM_EMAIL uses your verified domain and that the contact properties role, databases and ai_tools exist in Resend → Contacts → Properties.",
  invalid_from_address: "RESEND_FROM_EMAIL must be an address on a domain verified in Resend.",
  rate_limit_exceeded: "Resend rate limit hit. Retry later or raise the limit.",
  daily_quota_exceeded: "The Resend daily sending quota is used up.",
};

async function resendError(res: Response, action: string): Promise<Error> {
  const raw = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    body = undefined;
  }
  const parsed = resendErrorSchema.safeParse(body);
  const name = parsed.success ? parsed.data.name : undefined;
  const message = (parsed.success ? parsed.data.message : undefined) ?? raw.slice(0, 200);
  const hint = name ? RESEND_HINTS[name] : undefined;
  return new Error(
    `[resend] ${action} failed (${res.status}${name ? ` ${name}` : ""}): ${message}${hint ? ` → ${hint}` : ""}`
  );
}

function resendFetch(apiKey: string, path: string, body: unknown, idempotencyKey?: string) {
  return fetch(`${RESEND_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
  });
}

function answerLines(signup: WaitlistSignup): string[] {
  return [
    signup.role ? `Role: ${signup.role}` : null,
    signup.databases?.length ? `Databases: ${signup.databases.join(", ")}` : null,
    signup.aiTools?.length ? `AI clients: ${signup.aiTools.join(", ")}` : null,
  ].filter((line): line is string => line !== null);
}

/** Creates the contact. Returns alreadyJoined when Resend reports the contact exists. */
async function createContact(config: ResendConfig, signup: WaitlistSignup): Promise<boolean> {
  const properties = Object.fromEntries(
    Object.entries({
      role: signup.role,
      databases: signup.databases?.join(", "),
      ai_tools: signup.aiTools?.join(", "),
    }).filter(([, value]) => value)
  );
  const res = await resendFetch(config.apiKey, "/contacts", {
    email: signup.email,
    unsubscribed: false,
    ...(Object.keys(properties).length > 0 ? { properties } : {}),
    ...(config.segmentId ? { segments: [{ id: config.segmentId }] } : {}),
  });
  if (res.ok) return false;
  // Duplicate handling is undocumented by Resend; 409 or an "already exists" message both mean joined.
  const err = await resendError(res, "create contact");
  if (res.status === 409 || /already exists/i.test(err.message)) return true;
  throw err;
}

async function sendEmail(config: ResendConfig, payload: object, idempotencyKey: string) {
  const res = await resendFetch(config.apiKey, "/emails", payload, idempotencyKey);
  if (!res.ok) throw await resendError(res, "send email");
}

/**
 * Adds the signup to Resend and, for new contacts, sends the confirmation and team notification
 * in parallel. Email failures are logged, not thrown: the signup itself already succeeded.
 */
export async function joinWithResend(
  config: ResendConfig,
  signup: WaitlistSignup
): Promise<{ alreadyJoined: boolean }> {
  const alreadyJoined = await createContact(config, signup);
  if (alreadyJoined || !config.fromEmail) return { alreadyJoined };

  const lines = answerLines(signup);
  const sends = [
    sendEmail(
      config,
      {
        from: config.fromEmail,
        to: [signup.email],
        ...(config.replyTo ? { reply_to: config.replyTo } : {}),
        subject: "You are on the TydBase private beta list",
        text: [
          "You are on the TydBase private beta waitlist.",
          "",
          "We are onboarding early teams in batches and prioritizing the database engines and MCP workflows requested most.",
          ...(lines.length > 0 ? ["", ...lines] : []),
          "",
          "Self-hosted TydBase stays Apache-2.0 and free forever.",
          "TydBase / Blivius HQ",
        ].join("\n"),
      },
      `tydbase-waitlist-${signup.email}`
    ),
  ];
  if (config.notifyEmail) {
    sends.push(
      sendEmail(
        config,
        {
          from: config.fromEmail,
          to: [config.notifyEmail],
          subject: `New TydBase beta signup: ${signup.email}`,
          text: [
            `Email: ${signup.email}`,
            `Source: ${signup.source ?? "tydbase.blivius.com"}`,
            ...lines,
          ].join("\n"),
        },
        `tydbase-waitlist-notify-${signup.email}`
      )
    );
  }
  for (const result of await Promise.allSettled(sends)) {
    if (result.status === "rejected") {
      console.error(result.reason instanceof Error ? result.reason.message : result.reason);
    }
  }
  return { alreadyJoined };
}
