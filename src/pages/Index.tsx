
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import BackgroundProvider from "@/components/BackgroundProvider";
import ProcessSection from "@/components/ProcessSection";
import Solution from "@/components/Solution";
import Features from "@/components/Features";
import Testimonials from "@/components/ui/testimonials-columns-1";
import { Pricing } from "@/components/Pricing";
import ScrollAnimatedSection from "@/components/ScrollAnimatedSection";
import PublicPageWrapper from "@/components/PublicPageWrapper";

const Index = () => {
  return (
    <PublicPageWrapper>
      <div className="min-h-screen w-full">
        {/* Hero Section with green effects */}
        <div className="min-h-screen">
          <BackgroundProvider variant="hero">
            <Header />
            <HeroSection />
          </BackgroundProvider>
        </div>
        
        {/* All other sections with pure dark blue background */}
        <BackgroundProvider variant="dark">
          {/* Solution Section */}
          <ScrollAnimatedSection delay={50} config={{ threshold: 0.05, rootMargin: '200px 0px 0px 0px' }}>
            <div className="pt-1 md:pt-0">
              <Solution />
            </div>
          </ScrollAnimatedSection>

          {/* Process Section */}
          <ScrollAnimatedSection delay={100} config={{ threshold: 0.05, rootMargin: '200px 0px 0px 0px' }}>
            <ProcessSection />
          </ScrollAnimatedSection>

          {/* Features Section */}
          <ScrollAnimatedSection delay={50} config={{ threshold: 0.05, rootMargin: '200px 0px 0px 0px' }}>
            <Features />
          </ScrollAnimatedSection>

          {/* Testimonials Section */}
          <ScrollAnimatedSection delay={100} config={{ threshold: 0.05, rootMargin: '200px 0px 0px 0px' }}>
            <Testimonials />
          </ScrollAnimatedSection>

          {/* Pricing Section */}
          <ScrollAnimatedSection delay={50} config={{ threshold: 0.05, rootMargin: '200px 0px 0px 0px' }}>
            <div id="pricing">
              <Pricing />
            </div>
          </ScrollAnimatedSection>
        </BackgroundProvider>
      </div>
    </PublicPageWrapper>
  );
};

export default Index;
