import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ProcessSection from "@/components/ProcessSection";
import PainPoint from "@/components/PainPoint";
import Solution from "@/components/Solution";
import Features from "@/components/Features";
import SocialProof from "@/components/SocialProof";
import { PricingBasic } from "@/components/PricingBasic";
import ScrollAnimatedSection from "@/components/ScrollAnimatedSection";
import { Clock, PhoneOff, MessageSquareX } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const Index = () => {
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);

  const painPoints = [
    {
      icon: Clock,
      title: "Hours wasted on back-and-forth messaging",
      description: "Every day you lose valuable time scheduling appointments via WhatsApp. Customers ask questions at impossible times and you miss opportunities.",
      color: "from-red-500 to-red-600"
    },
    {
      icon: PhoneOff,
      title: "Missed calls = missed revenue", 
      description: "When you're not available, potential customers go to competitors. Every missed call is direct revenue loss.",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: MessageSquareX,
      title: "Customer frustration from slow responses",
      description: "Customers expect quick answers. Delayed responses lead to dissatisfaction and negative reviews that damage your reputation.",
      color: "from-red-600 to-red-700"
    }
  ];

  // Handle carousel scroll and update active indicator
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const handleScroll = () => {
      const scrollLeft = carousel.scrollLeft;
      const itemWidth = carousel.children[0]?.clientWidth || 0;
      const newIndex = Math.round(scrollLeft / itemWidth);
      setActiveCarouselIndex(newIndex);
      setIsAutoScrolling(false);
    };

    carousel.addEventListener('scroll', handleScroll, { passive: true });
    return () => carousel.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle carousel indicator click
  const handleIndicatorClick = (index: number) => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    
    const itemWidth = carousel.children[0]?.clientWidth || 0;
    carousel.scrollTo({
      left: index * itemWidth,
      behavior: 'smooth'
    });
    setActiveCarouselIndex(index);
    setIsAutoScrolling(false);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      
      {/* Pain Points Section - Direct connection, no white space */}
      <ScrollAnimatedSection>
        <section className="py-6 md:py-20 px-3 md:px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-6 md:mb-16">
              <h2 className="text-lg md:text-5xl font-bold text-white mb-2 md:mb-6">
                Do you recognize this <span className="text-red-400">problem</span>?
              </h2>
              <p className="text-sm md:text-xl text-slate-300 max-w-3xl mx-auto px-3 sm:px-0">
                These daily frustrations cost you time, money and customers. It's time for a solution.
              </p>
            </div>
            
            {/* Desktop: Grid layout */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-12">
              {painPoints.map((painPoint, index) => (
                <ScrollAnimatedSection key={index} delay={index * 150}>
                  <PainPoint
                    icon={painPoint.icon}
                    title={painPoint.title}
                    description={painPoint.description}
                    color={painPoint.color}
                  />
                </ScrollAnimatedSection>
              ))}
            </div>

            {/* Mobile: Perfect snapping carousel */}
            <div className="md:hidden">
              <div 
                ref={carouselRef}
                className="overflow-x-auto snap-x snap-mandatory scroll-smooth overscroll-x-contain perfect-snap-carousel"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                <div className="flex pb-4">
                  {painPoints.map((painPoint, index) => (
                    <div key={index} className="w-[100vw] flex-none snap-start snap-always px-4">
                      <PainPoint
                        icon={painPoint.icon}
                        title={painPoint.title}
                        description={painPoint.description}
                        color={painPoint.color}
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Interactive carousel indicators */}
              <div className="flex justify-center space-x-2 mt-4">
                {painPoints.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handleIndicatorClick(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === activeCarouselIndex
                        ? 'bg-red-400 w-6'
                        : 'bg-slate-600 hover:bg-slate-500'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      </ScrollAnimatedSection>

      {/* Solution Section - Direct connection */}
      <ScrollAnimatedSection delay={100}>
        <Solution />
      </ScrollAnimatedSection>

      {/* Process Section - Direct connection */}
      <ScrollAnimatedSection delay={200}>
        <ProcessSection />
      </ScrollAnimatedSection>

      {/* Features Section - Direct connection */}
      <ScrollAnimatedSection delay={100}>
        <Features />
      </ScrollAnimatedSection>

      {/* Social Proof Section - Direct connection */}
      <ScrollAnimatedSection delay={200}>
        <SocialProof />
      </ScrollAnimatedSection>

      {/* Pricing Section - Direct connection */}
      <ScrollAnimatedSection delay={100}>
        <div id="pricing">
          <PricingBasic />
        </div>
      </ScrollAnimatedSection>
    </div>
  );
};

export default Index;
