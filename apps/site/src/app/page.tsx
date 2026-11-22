import { ArchitectureSection } from "@/components/architecture-section";
import { Footer } from "@/components/footer";
import { HeroSection } from "@/components/hero-section";
import { InteractivePlaygroundSection } from "@/components/interactive-playground-section";
import { Navbar } from "@/components/navbar";
import { ProblemStorySection } from "@/components/problem-story-section";
import { SelfHostCloudSection } from "@/components/self-host-cloud-section";
import { WaitlistSection } from "@/components/waitlist-section";

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-ground text-ink">
      <Navbar />
      <main>
        <HeroSection />
        <ProblemStorySection />
        <InteractivePlaygroundSection />
        <ArchitectureSection />
        <SelfHostCloudSection />
        <WaitlistSection />
      </main>
      <Footer />
    </div>
  );
}
