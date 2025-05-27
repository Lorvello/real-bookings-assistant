
import Hero from "@/components/Hero";
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
      <Hero />
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
