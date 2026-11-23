import { TydBaseLogo } from "@tydbase/ui";
import Link from "next/link";
import { GithubLink } from "@/components/github-link";

export function Navbar() {
  return (
    <header
      className="sticky top-0 w-full border-b border-line bg-ground"
      style={{ zIndex: "var(--z-sticky-nav)", height: "var(--banner-height)" }}
    >
      <div className="tyd-container flex h-full items-center justify-between gap-4">
        <div className="flex min-w-0 items-baseline gap-3">
          <Link href="/" aria-label="TydBase home" className="shrink-0 text-ink">
            <TydBaseLogo className="h-5 w-auto" />
          </Link>
          <a
            href="https://blivius.com"
            className="hidden text-sm whitespace-nowrap text-ink-muted transition-colors hover:text-ink sm:inline"
          >
            by Blivius
          </a>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <GithubLink className="hidden text-sm text-ink-secondary transition-colors hover:text-ink sm:inline" />
          <a href="#join" className="tyd-btn-secondary">
            Join the beta
          </a>
        </div>
      </div>
    </header>
  );
}
