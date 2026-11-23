import { TydBaseLogo } from "@tydbase/ui";
import Link from "next/link";
import { GithubLink } from "@/components/github-link";

export function Footer() {
  return (
    <footer className="border-t border-line bg-ground" style={{ paddingBlock: "var(--space-10)" }}>
      <div className="tyd-container flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <TydBaseLogo className="h-9 w-auto self-start text-ink" />
          <p className="tyd-lead">
            by{" "}
            <a href="https://blivius.com" className="tyd-link">
              Blivius
            </a>
            , who also build{" "}
            <a href="https://dispach.blivius.com" className="tyd-link">
              Dispach
            </a>
            .
          </p>
        </div>
        <div className="flex flex-col justify-between gap-4 border-t border-line pt-6 text-sm sm:flex-row">
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-ink-secondary">
            <GithubLink className="transition-colors hover:text-ink" />
            <Link href="/privacy" className="transition-colors hover:text-ink">
              Privacy
            </Link>
            <a href="https://blivius.com" className="transition-colors hover:text-ink">
              blivius.com
            </a>
          </nav>
          <p className="text-ink-muted">Apache-2.0. © 2026 Blivius.</p>
        </div>
      </div>
    </footer>
  );
}
