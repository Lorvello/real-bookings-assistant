
import { Hero } from "@/components/ui/hero";
import PainPoint from "@/components/PainPoint";
import Solution from "@/components/Solution";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import Results from "@/components/Results";
import SocialProof from "@/components/SocialProof";
import CallToAction from "@/components/CallToAction";

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <Hero
        eyebrow="AI-POWERED BOOKING"
        title={
          <>
            Your AI Appointment Agent –<br />
            Bookings on{" "}
            <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
              Auto-Pilot
            </span>
          </>
        }
        subtitle="No phone calls, no missed leads, no double bookings. Fully automated, fully personal — all via WhatsApp."
        ctaText="Start Free Trial"
        ctaLink="#"
      />
      <PainPoint />
      <Solution />
      <HowItWorks />
      <Features />
      <Results />
      <SocialProof />
      <CallToAction />
    </div>
  );
};

export default Index;
