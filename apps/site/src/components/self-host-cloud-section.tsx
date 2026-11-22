import { Check } from "lucide-react";
import Link from "next/link";

const SELF_HOST_FEATURES = [
  "Every SQL, NoSQL, key-value, and vector engine",
  "Unlimited workspaces, teammates, environments, and RBAC",
  "Remote OAuth 2.1 MCP server and local stdio MCP CLI",
  "Human-in-the-loop write approvals and full audit logs",
  "wazero WebAssembly PII masking and query guardrails",
  "BYOK for Claude, OpenAI, Gemini, or local Ollama models",
];

const CLOUD_FEATURES = [
  "Zero-ops managed hosting at app.tydbase.com",
  "Always-on managed Relay Hub for private VPCs and localhost",
  "Free Hobby tier for solo builders; Pro Team from $15 to $19 per seat",
  "Bundled monthly managed AI credits plus optional team BYOK",
  "90-day audit retention, Slack approval alerts, and automatic backups",
  "Zero vendor lock-in: migrate to self-hosted anytime",
];

export function SelfHostCloudSection() {
  return (
    <section
      id="self-host"
      className="border-b border-line"
      style={{ paddingBlock: "var(--space-12)" }}
    >
      <div className="tyd-container flex flex-col gap-10">
        <div className="max-w-[60ch]">
          <h2 className="tyd-section-head font-semibold text-ink">
            Self-host every feature for $0 forever. Pay only for TydBase Cloud.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-secondary">
            No feature gates on self-hosted teams. Run the open-source Apache-2.0 stack on your own
            infrastructure, or let us manage hosting, relays, and AI credits on TydBase Cloud.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="tyd-panel flex flex-col justify-between p-7">
            <div>
              <div className="flex items-baseline justify-between gap-4 border-b border-line pb-5">
                <h3 className="tyd-title font-semibold text-ink">Self-Hosted (Apache-2.0)</h3>
                <span className="tyd-tabular font-display text-2xl font-semibold text-accent">
                  $0 forever
                </span>
              </div>
              <ul className="mt-6 space-y-3.5 text-[0.9375rem] text-ink-secondary">
                {SELF_HOST_FEATURES.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 border-t border-line pt-5">
              <p className="text-sm text-ink-muted">
                Single binary or Docker Compose, zero Auth0 or Firebase dependencies
              </p>
            </div>
          </div>

          <div className="tyd-panel flex flex-col justify-between border-accent/50 p-7">
            <div>
              <div className="flex items-baseline justify-between gap-4 border-b border-line pb-5">
                <h3 className="tyd-title font-semibold text-ink">TydBase Cloud (Managed)</h3>
                <span className="tyd-tabular font-display text-2xl font-semibold text-ink">
                  Free Hobby / Team SaaS
                </span>
              </div>
              <ul className="mt-6 space-y-3.5 text-[0.9375rem] text-ink-secondary">
                {CLOUD_FEATURES.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 flex items-center justify-between gap-4 border-t border-line pt-5">
              <p className="text-sm text-ink-muted">
                Private beta opens first on tydbase.blivius.com
              </p>
              <Link href="#waitlist" className="tyd-btn-primary">
                Reserve beta spot
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
