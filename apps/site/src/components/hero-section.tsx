import { CaughtWrite } from "@/components/caught-write";
import { WaitlistForm } from "@/components/waitlist-form";

export function HeroSection() {
  return (
    <section
      className="flex items-center border-b border-line"
      style={{
        minHeight: "calc(100dvh - var(--banner-height))",
        paddingBlock: "var(--space-8)",
      }}
    >
      <div className="tyd-container grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div className="flex flex-col gap-6">
          <h1 className="tyd-display max-w-[14ch] text-ink">
            Every agent write waits for a teammate.
          </h1>
          <p className="tyd-lead">
            Safe Postgres access for your team&apos;s AI agents. Open source, self-hosted.
          </p>
          <WaitlistForm source="hero" />
        </div>
        <CaughtWrite />
      </div>
    </section>
  );
}
