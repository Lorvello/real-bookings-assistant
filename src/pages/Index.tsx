
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

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Enhanced password reset handling - detect both errors and valid tokens
    const handlePasswordResetFlow = () => {
      const hash = window.location.hash.replace('#', '');
      const searchParams = new URLSearchParams(window.location.search);
      
      // Try hash first, then search params
      let params = new URLSearchParams(hash);
      if (!params.toString() && searchParams.toString()) {
        params = searchParams;
      }
      
      // Check for any password reset related parameters
      const error = params.get('error');
      const errorCode = params.get('error_code');
      const accessToken = params.get('access_token');
      const type = params.get('type');
      
      // If this is any password reset flow (errors or valid tokens), redirect to reset page
      const isPasswordResetFlow = (
        (error && (errorCode === 'otp_expired' || error === 'access_denied')) ||
        (accessToken && type === 'recovery')
      );
      
      if (isPasswordResetFlow) {
        console.log("🔍 Password reset flow detected on homepage, redirecting to reset page");
        const urlSuffix = hash ? `#${hash}` : window.location.search;
        navigate(`/reset-password${urlSuffix}`);
      }
    };

    handlePasswordResetFlow();
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
