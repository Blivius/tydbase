"use client";

import { TydBaseLogo } from "@tydbase/ui";
import Link from "next/link";

const NAV_LINKS = [
  { href: "#problem", label: "Problem" },
  { href: "#playground", label: "Live sandbox" },
  { href: "#architecture", label: "Architecture" },
  { href: "#self-host", label: "Self-host" },
  { href: "/demo", label: "Watch teaser" },
];

export function Navbar() {
  return (
    <header
      className="sticky top-0 w-full border-b border-line bg-ground/92 backdrop-blur-md"
      style={{ zIndex: "var(--z-sticky-nav)", height: "var(--banner-height)" }}
    >
      <div className="tyd-container flex h-full items-center justify-between gap-6">
        <Link
          href="/"
          className="flex shrink-0 items-center text-ink transition-opacity hover:opacity-85"
          aria-label="TydBase home"
        >
          <TydBaseLogo className="h-5 w-auto" />
        </Link>

        <nav aria-label="Primary navigation" className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap text-[0.9375rem] font-medium text-ink-secondary transition-colors hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <Link href="#waitlist" className="tyd-btn-primary">
            Join beta
          </Link>
        </div>
      </div>
    </header>
  );
}
