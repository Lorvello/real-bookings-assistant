import { Sparkles } from "lucide-react";
import { WhatsAppBenefits } from "@/components/ui/feature-whatsapp-benefits";
import { useState, useRef, useEffect } from "react";
import StaggeredAnimationContainer from './StaggeredAnimationContainer';

const Solution = () => {
  const [activeSolutionIndex, setActiveSolutionIndex] = useState(0);
  const solutionCarouselRef = useRef<HTMLDivElement>(null);

  // Handle solution carousel scroll
  useEffect(() => {
    const carousel = solutionCarouselRef.current;
    if (!carousel) return;
    const handleScroll = () => {
      const scrollLeft = carousel.scrollLeft;
      const itemWidth = carousel.children[0]?.clientWidth || 0;
      const newIndex = Math.round(scrollLeft / itemWidth);
      setActiveSolutionIndex(newIndex);
    };
    carousel.addEventListener('scroll', handleScroll, {
      passive: true
    });
    return () => carousel.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle carousel indicator click
  const handleSolutionIndicatorClick = (index: number) => {
    const carousel = solutionCarouselRef.current;
    if (!carousel) return;
    const itemWidth = carousel.children[0]?.clientWidth || 0;
    carousel.scrollTo({
      left: index * itemWidth,
      behavior: 'smooth'
    });
  };

  return (
    <section className="relative -mt-16 md:-mt-8 py-1 md:py-16 overflow-hidden">
      
      {/* Grid pattern overlay with emerald tint */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:32px_32px] md:bg-[size:64px_64px] opacity-50"></div>
      
      {/* Connecting noodle lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }} viewBox="0 0 1200 1000" preserveAspectRatio="xMidYMid slice">
        <path className="noodle-line" d="M 300 100 Q 600 200 600 500 T 900 900" style={{ animationDelay: '2s', opacity: 0.3 }} />
      </svg>
      
      <div className="max-w-6xl mx-auto relative z-20 px-4 md:px-6 lg:px-8">
        <StaggeredAnimationContainer 
          staggerDelay={300} 
          variant="hero"
          className="space-y-3 md:space-y-12"
        >
          {/* Header - HEADERS (Largest) */}
          <div className="text-center pt-2 md:pt-8">
            <Sparkles className="mx-auto w-6 h-6 md:w-8 md:h-8 text-emerald-500/60 mb-4 md:mb-6" />
            <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-light text-white mb-4 md:mb-6 leading-tight px-2 md:px-0">
              Meet Your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600 biolum-text font-medium">
                24/7 Booking Assistant
              </span>
            </h2>
            <p className="text-xs md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed px-3 sm:px-0 mb-4 md:mb-6">
              <span className="md:hidden">AI that never sleeps, never misses bookings.</span>
              <span className="hidden md:inline">The AI that never sleeps, never misses a lead, and books appointments 
              faster than any human could.</span>
            </p>
            
            <p className="text-sm md:text-base text-emerald-400/80 tracking-wide mb-8 md:mb-0">
              <span className="border-b border-emerald-400/40 pb-0.5">Here's what makes it revolutionary:</span>
            </p>
          </div>
          
          {/* Enhanced Benefits Section with Visual Separation */}
          <div className="relative">
            {/* Visual separator with subtle gradient */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent"></div>
            <div className="pt-2 md:pt-4">
              <WhatsAppBenefits />
            </div>
          </div>
        </StaggeredAnimationContainer>
      </div>
    </section>
  );
};

export default Solution;
