import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ProcessSection from "@/components/ProcessSection";
import PainPoint from "@/components/PainPoint";
import Solution from "@/components/Solution";
import Features from "@/components/Features";
import SocialProof from "@/components/SocialProof";
import { Pricing } from "@/components/Pricing";
import EnhancedScrollSection from "@/components/EnhancedScrollSection";
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
      
      {/* Pain Points Section - Luxury Enhanced */}
      <EnhancedScrollSection 
        animationType="stagger" 
        delay={200}
        enableCursorGradient={true}
      >
        <section className="space-luxury-md bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 relative overflow-hidden">
          {/* Enhanced background with depth layers */}
          <div className="absolute inset-0">
            <div className="absolute top-20 left-10 w-96 h-96 bg-red-500/8 rounded-full blur-3xl animate-breathe"></div>
            <div className="absolute bottom-20 right-10 w-[28rem] h-[28rem] bg-orange-500/6 rounded-full blur-3xl animate-breathe delay-luxury-2"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-400/4 rounded-full blur-3xl"></div>
          </div>
          
          {/* Luxury grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.08)_1px,transparent_1px)] bg-[size:80px_80px] opacity-30"></div>
          
          <div className="container-luxury relative z-10">
            <div className="text-center breathe-lg">
              <h2 className="text-3xl md:text-5xl xl:text-6xl font-black text-white breathe-sm text-balance reading-width-wide mx-auto">
                Do you recognize this <span className="bg-gradient-to-r from-red-400 via-orange-400 to-red-500 bg-clip-text text-transparent">problem</span>?
              </h2>
              <p className="text-lg md:text-xl text-slate-300 reading-width mx-auto font-light leading-relaxed text-pretty">
                These daily frustrations cost you time, money and customers. It's time for a solution.
              </p>
            </div>
            
            {/* Desktop: Enhanced grid layout with staggered animations */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-golden-lg">
              {painPoints.map((painPoint, index) => (
                <EnhancedScrollSection key={index} delay={index * 200} animationType="stagger">
                  <div className="group relative">
                    {/* Luxury card background with glassmorphism */}
                    <div className="absolute inset-0 glass-subtle rounded-3xl shadow-luxury-md group-hover:shadow-luxury-lg transition-luxury"></div>
                    <div className="relative p-8 md:p-10">
                      <PainPoint
                        icon={painPoint.icon}
                        title={painPoint.title}
                        description={painPoint.description}
                        color={painPoint.color}
                      />
                    </div>
                  </div>
                </EnhancedScrollSection>
              ))}
            </div>

            {/* Mobile: Enhanced snapping carousel */}
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
                <div className="flex pb-6">
                  {painPoints.map((painPoint, index) => (
                    <div key={index} className="w-[calc(100vw-2rem)] flex-none snap-start snap-always mx-4">
                      <div className="glass-subtle rounded-3xl p-6 shadow-luxury-sm">
                        <PainPoint
                          icon={painPoint.icon}
                          title={painPoint.title}
                          description={painPoint.description}
                          color={painPoint.color}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Enhanced carousel indicators */}
              <div className="flex justify-center space-x-3 mt-8">
                {painPoints.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handleIndicatorClick(index)}
                    className={`h-3 rounded-full transition-luxury ${
                      index === activeCarouselIndex
                        ? 'bg-red-400 w-8 shadow-luxury-sm'
                        : 'bg-slate-600 w-3 hover:bg-slate-500 hover:shadow-luxury-sm'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      </EnhancedScrollSection>

      {/* Solution Section - Increased mobile padding */}
      <Solution />

      {/* Process Section - Increased mobile padding */}
      <EnhancedScrollSection delay={200} animationType="rotate">
        <ProcessSection />
      </EnhancedScrollSection>

      {/* Features Section - Increased mobile padding */}
      <EnhancedScrollSection delay={100} enableCursorGradient={true}>
        <Features />
      </EnhancedScrollSection>

      {/* Social Proof Section - Increased mobile padding */}
      <EnhancedScrollSection delay={200} animationType="stagger">
        <SocialProof />
      </EnhancedScrollSection>

      {/* Pricing Section - Increased mobile padding */}
      <EnhancedScrollSection delay={100}>
        <div id="pricing">
          <Pricing />
        </div>
      </EnhancedScrollSection>
    </div>
  );
};

export default Index;
