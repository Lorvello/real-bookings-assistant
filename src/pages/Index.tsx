
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { useVoiceflowChatbot } from "@/hooks/useVoiceflowChatbot";

const Index = () => {
  const navigate = useNavigate();
  useVoiceflowChatbot();

  useEffect(() => {
    // Check for password reset parameters in URL hash or search
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
    
    // Check for any password reset related parameters
    const hasResetParams = 
      urlParams.get('access_token') || 
      urlParams.get('refresh_token') || 
      urlParams.get('token') || 
      urlParams.get('type') === 'recovery' ||
      hashParams.get('access_token') || 
      hashParams.get('refresh_token') || 
      hashParams.get('token') || 
      hashParams.get('type') === 'recovery' ||
      urlParams.get('error_description')?.includes('expired') ||
      hashParams.get('error_description')?.includes('expired');

    if (hasResetParams) {
      console.log('Password reset parameters detected, redirecting to /reset-password');
      navigate('/reset-password' + window.location.search + window.location.hash);
    }
  }, [navigate]);

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
            <div className="pt-0 md:pt-0">
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
