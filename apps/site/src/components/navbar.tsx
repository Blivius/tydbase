"use client";

import { TydBaseLogo } from "@tydbase/ui";
import Link from "next/link";

const NAV_LINKS = [
  { href: "#problem", label: "Problem" },
  { href: "#playground", label: "Live sandbox" },
  { href: "#architecture", label: "Architecture" },
  { href: "#self-host", label: "Self-host" },
];

export function Navbar() {
  return (
    <header
      className="sticky top-0 w-full border-b border-line bg-ground/95 backdrop-blur-md"
      style={{ zIndex: "var(--z-sticky-nav)", height: "var(--banner-height)" }}
    >
      <div className="tyd-container flex h-full items-stretch justify-between gap-6">
        <Link
          href="/"
          className="flex shrink-0 items-center text-ink transition-opacity hover:opacity-85"
          aria-label="TydBase home"
        >
          <TydBaseLogo className="h-5 w-auto" />
        </Link>

        <nav aria-label="Primary navigation" className="tyd-nav-rail hidden md:flex">
          {NAV_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className="tyd-nav-link">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center">
          <Link href="#waitlist" className="tyd-btn-primary">
            Join beta
          </Link>
        </div>
      </div>
    </header>
  );
}
