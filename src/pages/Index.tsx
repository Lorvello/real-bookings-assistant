
import Hero from "@/components/Hero";
import Timeline from "@/components/Timeline";
import ProcessSection from "@/components/ProcessSection";
import PainPoint from "@/components/PainPoint";
import Solution from "@/components/Solution";
import Features from "@/components/Features";
import Results from "@/components/Results";
import SocialProof from "@/components/SocialProof";
import CallToAction from "@/components/CallToAction";

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <Hero />
      <ProcessSection />
      <Timeline />
      <PainPoint />
      <Solution />
      <Features />
      <Results />
      <SocialProof />
      <CallToAction />
    </div>
  );
};

export default Index;
