import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "Privacy | TydBase",
  description:
    "What the TydBase beta waitlist collects, why, where it is kept, and how to remove it.",
  alternates: { canonical: "/privacy" },
};

// The contact address comes from the runtime env (RESEND_NOTIFY_EMAIL), which Docker images and
// preview builds don't have at build time, so render per request.
export const dynamic = "force-dynamic";

const UPDATED = "23 November 2026";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line" style={{ paddingBlock: "var(--space-6)" }}>
      <h2 className="tyd-title text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-ink-secondary">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  const contact = process.env.RESEND_NOTIFY_EMAIL?.trim();
  const contactLink = contact ? (
    <a href={`mailto:${contact}`} className="text-ink underline underline-offset-2">
      {contact}
    </a>
  ) : (
    "the address in your confirmation email"
  );

  return (
    <>
      <Navbar />
      <main className="tyd-container" style={{ paddingBlock: "var(--space-10) var(--space-8)" }}>
        <div className="max-w-3xl">
          <h1 className="tyd-section-head text-ink">Privacy</h1>
          <p className="mt-4 text-ink-secondary">
            TydBase is a Blivius project. This page covers tydbase.blivius.com: the beta waitlist,
            the in-browser demo and the site&apos;s analytics. Last updated {UPDATED}.
          </p>

          <div className="mt-8">
            <Section title="What the waitlist collects">
              <p>
                Your email address and which link brought you here (for example, a Hacker News or
                Reddit post). If you answer the optional second step: your team size and what you
                wrote about your agents and databases.
              </p>
            </Section>

            <Section title="Why">
              <p>
                To send your beta invite and release notes, to pick the first beta teams, and to
                decide what to build first. Nothing else. We don&apos;t sell or share it.
              </p>
            </Section>

            <Section title="Where it is kept">
              <p>
                With Resend, our email provider, which stores the contact and sends the emails.
                While handling a signup, the server briefly keeps your IP address in memory to stop
                abuse. It is never written to disk.
              </p>
            </Section>

            <Section title="The demo">
              <p>
                The demo runs PostgreSQL inside your browser on sample data. Nothing it does leaves
                your device.
              </p>
            </Section>

            <Section title="Cookies and analytics">
              <p>
                This site sets no cookies and runs no ad trackers. It counts visits and a few
                actions (approving in the demo, joining the list) with PostHog in cookieless mode:
                no cookies or browser storage, and requests go through this site rather than
                straight to PostHog. The answers you type are not sent to PostHog.
              </p>
            </Section>

            <Section title="Removing your data">
              <p>
                Email {contactLink} and we will delete your contact. Release-note emails also carry
                an unsubscribe link.
              </p>
            </Section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
