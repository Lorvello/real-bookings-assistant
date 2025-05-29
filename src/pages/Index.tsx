
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ProcessSection from "@/components/ProcessSection";
import PainPoint from "@/components/PainPoint";
import Solution from "@/components/Solution";
import Features from "@/components/Features";
import SocialProof from "@/components/SocialProof";
import { PricingBasic } from "@/components/PricingBasic";
import ScrollAnimatedSection from "@/components/ScrollAnimatedSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <ScrollAnimatedSection>
        <PainPoint />
      </ScrollAnimatedSection>
      <ScrollAnimatedSection delay={100}>
        <Solution />
      </ScrollAnimatedSection>
      <ScrollAnimatedSection delay={200}>
        <ProcessSection />
      </ScrollAnimatedSection>
      <ScrollAnimatedSection delay={100}>
        <Features />
      </ScrollAnimatedSection>
      <ScrollAnimatedSection delay={200}>
        <SocialProof />
      </ScrollAnimatedSection>
      <ScrollAnimatedSection delay={100}>
        <PricingBasic />
      </ScrollAnimatedSection>
    </div>
  );
};

export default Index;
