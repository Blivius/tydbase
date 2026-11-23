import { GithubLink } from "@/components/github-link";
import { TeamSwitcher } from "@/components/team-switcher";
import { WaitlistForm } from "@/components/waitlist-form";

const PROBLEMS = [
  {
    title: "Production on every laptop",
    line: "Each developer's agent needs a connection string, so the password sits in every .env file and every agent's context.",
  },
  {
    title: "Writes nobody reviewed",
    line: "Code goes through review. An agent's UPDATE runs the moment it is sent.",
  },
  {
    title: "No record of what agents saw",
    line: "When customer rows reach a model, nobody can say which rows, or whose agent asked.",
  },
] as const;

export function ProblemSection() {
  return (
    <section style={{ paddingBlock: "var(--space-16)" }}>
      <div className="tyd-container">
        <div className="tyd-rule flex flex-col gap-12 pt-12">
          <h2 className="tyd-section-head max-w-[22ch] text-ink">
            Agents run on copied connection strings
          </h2>
          <dl className="flex flex-col">
            {PROBLEMS.map((p) => (
              <div
                key={p.title}
                className="grid grid-cols-1 gap-2 border-t border-line py-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8"
              >
                <dt className="tyd-title text-ink">{p.title}</dt>
                <dd className="max-w-[60ch] text-ink-secondary">{p.line}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-ink-muted">
            It already happens:{" "}
            <a
              href="https://fortune.com/2025/07/23/ai-coding-tool-replit-wiped-database-called-it-a-catastrophic-failure/"
              className="tyd-link"
            >
              Fortune reported in July 2025
            </a>{" "}
            that an AI coding agent wiped a live company database during a code freeze.
          </p>
        </div>
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  return (
    <section
      id="how"
      className="border-t border-line bg-surface"
      style={{ paddingBlock: "var(--space-12)" }}
    >
      <div className="tyd-container flex flex-col gap-10">
        <div className="flex flex-col gap-4">
          <h2 className="tyd-section-head max-w-[20ch] text-ink">How a write gets through</h2>
          <p className="text-sm text-ink-muted">Planned interface, sample data.</p>
        </div>
        <TeamSwitcher />
      </div>
    </section>
  );
}

const STATUS = [
  {
    part: "Credential vault and metadata store",
    state: "Built",
    detail: "AES-256-GCM with a key per workspace, kept in SQLite",
    path: "/tree/main/engine/internal/platform",
  },
  {
    part: "Postgres driver with dry-run writes",
    state: "Next",
    detail: "Read-only queries with timeouts and row caps; writes rolled back into a diff",
    path: "",
  },
  {
    part: "Team server, tokens and approvals",
    state: "Planned",
    detail: "One server holds the password; a teammate approves each write",
    path: "",
  },
  {
    part: "CLI, agent skill and terminal UI",
    state: "Planned",
    detail: "For Claude Code, Codex and Cursor, plus a terminal UI for people",
    path: "",
  },
  {
    part: "Plugins for other databases",
    state: "Planned",
    detail: "SQLite and LibSQL first, then the engines teams ask for",
    path: "",
  },
] as const;

export function StatusSection() {
  return (
    <section className="border-t border-line" style={{ paddingBlock: "var(--space-16)" }}>
      <div className="tyd-container flex flex-col gap-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <h2 className="tyd-section-head text-ink">What exists today</h2>
          <div className="flex flex-col items-start gap-4">
            <p className="tyd-lead">
              TydBase is Apache-2.0 and runs on your server, next to your database. Postgres comes
              first; every other database arrives as a driver plugin.
            </p>
            <GithubLink className="tyd-link" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line-strong text-sm text-ink-muted">
                <th scope="col" className="py-3 pr-6 font-normal whitespace-nowrap">
                  Part
                </th>
                <th scope="col" className="py-3 pr-6 font-normal whitespace-nowrap">
                  State
                </th>
                <th scope="col" className="py-3 font-normal whitespace-nowrap">
                  What it does
                </th>
              </tr>
            </thead>
            <tbody>
              {STATUS.map((row) => (
                <tr key={row.part} className="border-b border-line">
                  <th scope="row" className="py-5 pr-6 font-bold text-ink">
                    {row.part}
                  </th>
                  <td
                    className={`py-5 pr-6 whitespace-nowrap ${row.state === "Built" ? "text-accent" : "text-ink-secondary"}`}
                  >
                    {row.state}
                  </td>
                  <td className="py-5 text-ink-secondary">
                    {row.path ? (
                      <GithubLink path={row.path} className="tyd-link">
                        {row.detail}
                      </GithubLink>
                    ) : (
                      row.detail
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-ink-muted">
          The whole plan is public:{" "}
          <GithubLink path="/blob/main/docs/01-PLAN.md" className="tyd-link">
            docs/01-PLAN.md
          </GithubLink>
          .
        </p>
      </div>
    </section>
  );
}

const QUESTIONS = [
  {
    q: "Does our data leave our network?",
    a: "No. You run the server next to your database, and your agents talk to it. Nothing passes through us.",
  },
  {
    q: "How is this different from hoop.dev or Formal?",
    a: "They are broad access gateways covering many protocols and tools. TydBase does one job for small teams: Postgres, coding agents, and the row diff inside the approval.",
  },
  {
    q: "What about MCP?",
    a: "Agents use a CLI and a skill, which costs less context than tool definitions. An MCP adapter comes later for clients without a shell.",
  },
  {
    q: "What will it cost?",
    a: "Self-hosting is free under Apache-2.0, with every feature. A managed cloud comes later.",
  },
] as const;

export function FaqSection() {
  return (
    <section style={{ paddingBlock: "var(--space-16)" }}>
      <div className="tyd-container">
        <div className="tyd-rule grid grid-cols-1 gap-10 pt-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <div
            className="flex flex-col gap-5 self-start lg:sticky"
            style={{ top: "calc(var(--banner-height) + var(--space-6))" }}
          >
            <h2 className="tyd-section-head text-ink">Why not just a read-only role?</h2>
            <p className="tyd-lead">
              Use one; TydBase connects with a least-privilege role too. A role can&apos;t show a
              teammate the diff before a write, mask a column per agent, or record which agent
              asked.
            </p>
          </div>
          <dl className="flex flex-col">
            {QUESTIONS.map((item) => (
              <div key={item.q} className="flex flex-col gap-2 border-t border-line py-6">
                <dt className="tyd-title text-ink">{item.q}</dt>
                <dd className="max-w-[62ch] text-ink-secondary">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

export function ClosingSection() {
  return (
    <section
      id="join"
      className="border-t border-line bg-surface"
      style={{ paddingBlock: "var(--space-12)", scrollMarginTop: "var(--banner-height)" }}
    >
      <div className="tyd-container grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div className="flex flex-col gap-4">
          <h2 className="tyd-section-head text-ink">Join the Postgres beta</h2>
          <p className="tyd-lead">We&apos;re picking the first teams from this list.</p>
        </div>
        <WaitlistForm source="close" wide />
      </div>
    </section>
  );
}
