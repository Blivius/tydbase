import { z } from "zod";
import { BOOKING_URL } from "@/lib/links";

// Resend REST client for the waitlist. Step 1 creates one global contact per email (optional
// segment, `source` property) and sends a confirmation plus a team notification. Step 2 patches the
// same contact with `team_size` and `worry` and forwards the answer to the team. All three contact
// properties must exist in Resend → Contacts → Properties, or Resend rejects the call.

const RESEND_API = "https://api.resend.com";
const RESEND_TIMEOUT_MS = 8_000;

export const TEAM_SIZES = ["solo", "2-10", "11-50", "50+"] as const;
export type TeamSize = (typeof TEAM_SIZES)[number];

export interface WaitlistSignup {
  email: string;
  source?: string | undefined;
}

export interface WaitlistDetails {
  email: string;
  teamSize?: TeamSize | undefined;
  worry?: string | undefined;
}

export interface ResendConfig {
  apiKey: string;
  fromEmail?: string | undefined;
  notifyEmail?: string | undefined;
  replyTo?: string | undefined;
  segmentId?: string | undefined;
}

// The confirmation is written as a personal note, so the reply rate is the point. The HTML part only
// adds the booking button; email clients can't read OKLCH, so the accent is its sRGB approximation.
const SITE_URL = "https://tydbase.blivius.com";
const CONFIRMATION_PARAGRAPHS = [
  "Thanks for joining the TydBase beta list.",
  "TydBase is a server your team runs between your coding agents and Postgres. Each agent gets a token instead of the password, reads are scoped and masked, and every write waits for a teammate to approve the row diff.",
  "We're choosing the first beta teams by hand, so it helps to know how you work today. Hit reply and tell me which agent touches which database, and what you'd hate for it to do. Or, if talking is easier, book 20 minutes with me:",
];
const CONFIRMATION_CLOSING = "The self-hosted server will be Apache-2.0 and free.";

const CONFIRMATION_EMAIL = {
  subject: "You're on the TydBase beta list",
  text: [
    "Hi,",
    ...CONFIRMATION_PARAGRAPHS,
    BOOKING_URL,
    CONFIRMATION_CLOSING,
    `Moeen\nTydBase by Blivius\n${SITE_URL}`,
  ].join("\n\n"),
  html: `<div style="max-width:560px;margin:0 auto;padding:32px 24px;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#16211c">
<p style="margin:0 0 28px;font-size:16px;font-weight:700">TydBase <span style="font-weight:400;color:#5b6b63">by Blivius</span></p>
<p style="margin:0 0 16px">Hi,</p>
${CONFIRMATION_PARAGRAPHS.map((p) => `<p style="margin:0 0 16px">${p}</p>`).join("\n")}
<p style="margin:0 0 24px"><a href="${BOOKING_URL}" style="display:inline-block;padding:11px 18px;background:#3fcf93;color:#07140e;border-radius:2px;font-weight:600;text-decoration:none">Book 20 minutes</a></p>
<p style="margin:0 0 24px">${CONFIRMATION_CLOSING}</p>
<p style="margin:0;padding-top:16px;border-top:2px solid #e3e8e5">Moeen<br><a href="${SITE_URL}" style="color:#5b6b63">TydBase by Blivius</a></p>
</div>`,
};

const resendErrorSchema = z.object({ name: z.string().optional(), message: z.string().optional() });

// What to do about each Resend error name we have hit or can expect. Shown in server logs only.
const RESEND_HINTS: Record<string, string> = {
  restricted_api_key:
    "RESEND_API_KEY can only send emails. Create a Full access key in Resend → API Keys.",
  invalid_api_key: "RESEND_API_KEY is wrong or revoked. Create a new key in Resend → API Keys.",
  missing_api_key: "RESEND_API_KEY is empty.",
  validation_error:
    "Check that RESEND_FROM_EMAIL uses your verified domain and that the contact properties source, team_size and worry exist in Resend → Contacts → Properties.",
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

function resendFetch(
  apiKey: string,
  path: string,
  body: unknown,
  idempotencyKey?: string,
  method: "POST" | "PATCH" = "POST"
) {
  return fetch(`${RESEND_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
  });
}

/** Creates the contact. Returns alreadyJoined when Resend reports the contact exists. */
async function createContact(config: ResendConfig, signup: WaitlistSignup): Promise<boolean> {
  const res = await resendFetch(config.apiKey, "/contacts", {
    email: signup.email,
    unsubscribed: false,
    ...(signup.source ? { properties: { source: signup.source } } : {}),
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

  const sends = [
    sendEmail(
      config,
      {
        from: config.fromEmail,
        to: [signup.email],
        ...(config.replyTo ? { reply_to: config.replyTo } : {}),
        ...CONFIRMATION_EMAIL,
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
          reply_to: signup.email,
          subject: `New TydBase beta signup: ${signup.email}`,
          text: [
            `Email: ${signup.email}`,
            `Source: ${signup.source ?? "tydbase.blivius.com"}`,
          ].join("\n"),
        },
        `tydbase-waitlist-notify-${signup.email}`
      )
    );
  }
  logRejected(await Promise.allSettled(sends));
  return { alreadyJoined };
}

function logRejected(results: PromiseSettledResult<unknown>[]) {
  for (const result of results) {
    if (result.status === "rejected") {
      console.error(result.reason instanceof Error ? result.reason.message : result.reason);
    }
  }
}

/**
 * Step 2: stores team size and the free-text worry on the contact and forwards them to the team.
 * ponytail: unauthenticated, so anyone who knows an address can overwrite its answers. Acceptable
 * for research data seen only by us; sign the step-1 response if it ever gates anything.
 */
export async function saveDetails(config: ResendConfig, details: WaitlistDetails): Promise<void> {
  const properties = Object.fromEntries(
    Object.entries({ team_size: details.teamSize, worry: details.worry }).filter(([, v]) => v)
  );
  const res = await resendFetch(
    config.apiKey,
    `/contacts/${encodeURIComponent(details.email)}`,
    { properties },
    undefined,
    "PATCH"
  );
  if (!res.ok) throw await resendError(res, "update contact");

  if (!config.fromEmail || !config.notifyEmail) return;
  logRejected(
    await Promise.allSettled([
      sendEmail(
        config,
        {
          from: config.fromEmail,
          to: [config.notifyEmail],
          reply_to: details.email,
          subject: `TydBase beta answer: ${details.email}`,
          text: [
            `Email: ${details.email}`,
            `Team size: ${details.teamSize ?? "not given"}`,
            "",
            details.worry ?? "(no worry written)",
          ].join("\n"),
        },
        `tydbase-waitlist-details-${details.email}`
      ),
    ])
  );
}
