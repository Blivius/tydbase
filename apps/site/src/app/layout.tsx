import type { Metadata } from "next";
import { JetBrains_Mono, Newsreader, Schibsted_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import { Analytics } from "@/components/analytics";
import "./globals.css";

const schibstedGrotesk = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  variable: "--font-schibsted",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// Blivius family marker (blivius.com and Dispach set their lead lines in it).
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-newsreader",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tydbase.blivius.com";
const title = "TydBase by Blivius: safe database access for your team's AI agents";
const description =
  "Your team's coding agents reach Postgres through TydBase. They never hold the password, and every write waits for a teammate who sees the row diff. Open source and self-hosted.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  icons: { icon: "/favicon.png" },
  openGraph: { title, description, url: siteUrl, siteName: "TydBase", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${schibstedGrotesk.variable} ${jetBrainsMono.variable} ${newsreader.variable}`}
    >
      {/* Browser extensions (e.g. Grammarly) add attributes to <body> before hydration; this
          silences only that element's attribute diff, not mismatches in the tree below. */}
      <body suppressHydrationWarning>
        <a
          href="#main"
          className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-4 focus-visible:left-4 focus-visible:bg-ink focus-visible:px-4 focus-visible:py-2 focus-visible:text-ground"
          style={{ zIndex: "var(--z-sticky-nav)" }}
        >
          Skip to content
        </a>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
