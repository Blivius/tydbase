import { Footer } from "@/components/footer";
import { HeroSection } from "@/components/hero-section";
import {
  ClosingSection,
  FaqSection,
  HowItWorksSection,
  ProblemSection,
  StatusSection,
} from "@/components/landing-sections";
import { Navbar } from "@/components/navbar";

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-ground text-ink">
      <Navbar />
      <main id="main">
        <HeroSection />
        <ProblemSection />
        <HowItWorksSection />
        <StatusSection />
        <FaqSection />
        <ClosingSection />
      </main>
      <Footer />
    </div>
  );
}
