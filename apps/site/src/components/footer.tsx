import { TydBaseLogo } from "@tydbase/ui";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-line bg-ground" style={{ paddingBlock: "var(--space-6)" }}>
      <div className="tyd-container flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <TydBaseLogo className="h-4 w-auto text-ink" />
          <span className="text-sm text-ink-muted">
            Apache-2.0 open source, built at Blivius HQ
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-sm text-ink-secondary">
          <Link href="/#playground" className="transition-colors hover:text-ink">
            Live sandbox
          </Link>
          <Link href="/demo" className="transition-colors hover:text-ink">
            Teaser demo
          </Link>
          <Link href="/#waitlist" className="transition-colors hover:text-ink">
            Private beta
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-ink">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
