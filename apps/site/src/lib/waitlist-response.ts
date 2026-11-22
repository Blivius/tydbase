import { z } from "zod";

const waitlistResponseSchema = z.object({ ok: z.boolean(), message: z.string().optional() });
export type WaitlistResponse = z.infer<typeof waitlistResponseSchema>;

/** Parses POST /api/waitlist's body. Anything unexpected (HTML error page, bad JSON) counts as a failure. */
export async function readWaitlistResponse(res: Response): Promise<WaitlistResponse> {
  try {
    const parsed = waitlistResponseSchema.safeParse(await res.json());
    if (parsed.success) return parsed.data;
  } catch {
    // fall through
  }
  return { ok: false };
}
