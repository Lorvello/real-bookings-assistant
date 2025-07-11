import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import BackgroundProvider from "@/components/BackgroundProvider";
import ProcessSection from "@/components/ProcessSection";
import Solution from "@/components/Solution";
import Features from "@/components/Features";
import SocialProof from "@/components/SocialProof";
import { Pricing } from "@/components/Pricing";
import ScrollAnimatedSection from "@/components/ScrollAnimatedSection";

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section with special gradient background */}
      <BackgroundProvider variant="hero">
        <Header />
        <HeroSection />
      </BackgroundProvider>

      {/* Rest of content with consistent dark background */}
      <BackgroundProvider variant="dark">
        {/* Solution Section */}
        <ScrollAnimatedSection delay={100}>
          <Solution />
        </ScrollAnimatedSection>

        {/* Process Section */}
        <ScrollAnimatedSection delay={200}>
          <ProcessSection />
        </ScrollAnimatedSection>

        {/* Features Section */}
        <ScrollAnimatedSection delay={100}>
          <Features />
        </ScrollAnimatedSection>

        {/* Social Proof Section */}
        <ScrollAnimatedSection delay={200}>
          <SocialProof />
        </ScrollAnimatedSection>

        {/* Pricing Section */}
        <ScrollAnimatedSection delay={100}>
          <div id="pricing">
            <Pricing />
          </div>
        </ScrollAnimatedSection>
      </BackgroundProvider>
    </div>
  );
};

export default Index;