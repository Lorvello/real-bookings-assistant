
import Hero from "@/components/Hero";
import ProcessSection from "@/components/ProcessSection";
import PainPoint from "@/components/PainPoint";
import Solution from "@/components/Solution";
import Features from "@/components/Features";
import SocialProof from "@/components/SocialProof";

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <Hero />
      <Solution />
      <PainPoint />
      <ProcessSection />
      <Features />
      <SocialProof />
    </div>
  );
};

export default Index;
