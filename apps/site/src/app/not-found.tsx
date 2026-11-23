import Link from "next/link";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="tyd-container" style={{ paddingBlock: "var(--space-10)" }}>
        <p className="tyd-tabular text-sm text-accent">404</p>
        <h1 className="tyd-section-head mt-3 text-ink">No such page.</h1>
        <p className="mt-4 max-w-xl text-ink-secondary">
          The link may be old or mistyped. The demo and the beta list are on the home page.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="tyd-btn-primary">
            Back to TydBase
          </Link>
          <Link href="/#join" className="tyd-btn-secondary">
            Join the beta
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
