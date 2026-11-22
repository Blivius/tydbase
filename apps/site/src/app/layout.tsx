import type { Metadata } from "next";
import { JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const schibstedGrotesk = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-schibsted",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tydbase.blivius.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "TydBase | Zero-install database workspace and governed MCP control plane",
  description:
    "Connect SQL, NoSQL, key-value, and vector databases once. Give teammates a fast browser workspace and give Claude, Codex, Gemini, and Cursor one OAuth-governed MCP endpoint. Self-host free under Apache-2.0.",
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "TydBase | One workspace and MCP control plane for every database",
    description:
      "Replace heavy local database clients and plaintext mcp.json credentials. Self-host for $0 forever under Apache-2.0, or use managed TydBase Cloud.",
    url: siteUrl,
    siteName: "TydBase",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TydBase | Zero-install database workspace and governed MCP gateway",
    description:
      "One browser workspace for PostgreSQL, MySQL, MongoDB, Redis, and vector databases, plus one governed OAuth MCP endpoint for AI agents.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${schibstedGrotesk.variable} ${jetBrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
