
import Hero from "@/components/Hero";
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
