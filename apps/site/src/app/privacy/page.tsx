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

const UPDATED = "22 November 2026";

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
            TydBase is a Blivius HQ project. This page covers tydbase.blivius.com: the beta waitlist
            and the in-browser playground. Last updated {UPDATED}.
          </p>

          <div className="mt-8">
            <Section title="What the waitlist collects">
              <p>
                Your email address. If you fill them in: your role or team size, the databases you
                use, and the AI tools you want connected.
              </p>
            </Section>

            <Section title="Why">
              <p>
                To send your beta invite and release notes, and to decide which database engines and
                AI clients to support first. Nothing else. We don&apos;t sell or share it.
              </p>
            </Section>

            <Section title="Where it is kept">
              <p>
                With Resend, our email provider, which stores the contact and sends the emails.
                While handling a signup, the server briefly keeps your IP address in memory to stop
                abuse. It is never written to disk.
              </p>
            </Section>

            <Section title="The playground">
              <p>
                The SQL playground runs PostgreSQL inside your browser. The queries you type and
                their results never leave your device.
              </p>
            </Section>

            <Section title="Cookies and tracking">
              <p>This site sets no cookies and runs no analytics or ad trackers.</p>
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
