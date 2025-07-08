
import { Button } from "@/components/ui/button";
import { MessageCircle, Brain, Target, Clock, Users, TrendingUp } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import EnhancedScrollSection from "@/components/EnhancedScrollSection";
import { useCursorGradient } from "@/hooks/useCursorGradient";

const Solution = () => {
  const [activeSolutionIndex, setActiveSolutionIndex] = useState(0);
  const solutionCarouselRef = useRef<HTMLDivElement>(null);

  const features = [
    {
      icon: MessageCircle,
      title: "Instant WhatsApp Responses",
      description: "Responds within seconds to every message, 24/7. Your customers get immediate answers to their questions and available time slots.",
      mobileDescription: "Instant 24/7 responses with available slots.",
      stat: "Average response: 3 seconds",
      color: "from-emerald-500 to-green-500",
      hoverTextColor: "group-hover:text-emerald-300"
    },
    {
      icon: Brain,
      title: "Smart Conversations",
      description: "Understands context, asks the right questions, and guides customers to the perfect appointment time that works for everyone.",
      mobileDescription: "Smart questions to find perfect appointment times.",
      stat: "98% customer satisfaction",
      color: "from-blue-500 to-indigo-500",
      hoverTextColor: "group-hover:text-blue-300"
    },
    {
      icon: Target,
      title: "Perfect For Every Business",
      description: "Salons, clinics, gyms, consultants - if you book appointments, our AI adapts to your specific business needs.",
      mobileDescription: "Adapts to any appointment-based business.",
      stat: "300% more bookings avg.",
      color: "from-purple-500 to-pink-500",
      hoverTextColor: "group-hover:text-purple-300"
    }
  ];

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

    carousel.addEventListener('scroll', handleScroll, { passive: true });
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
    <EnhancedScrollSection 
      className="space-luxury-lg bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 relative overflow-hidden"
      enableCursorGradient={true}
      animationType="stagger"
      delay={100}
    >
      {/* Enhanced background with luxury depth */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-96 h-96 bg-emerald-500/12 rounded-full blur-3xl animate-breathe"></div>
        <div className="absolute bottom-20 right-10 w-[32rem] h-[32rem] bg-green-500/10 rounded-full blur-3xl animate-breathe delay-luxury-3"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-emerald-400/6 rounded-full blur-3xl"></div>
      </div>
      
      {/* Premium grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.08)_1px,transparent_1px)] bg-[size:80px_80px] opacity-25"></div>
      
      <div className="container-luxury relative z-10">
        {/* Luxury header section */}
        <div className="text-center space-golden-lg">
          <div className="inline-flex items-center gap-3 glass-effect rounded-full px-6 py-3 md:px-8 md:py-4 breathe-md shadow-luxury-sm">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-emerald-300 text-sm md:text-base font-medium tracking-wide">The Solution</span>
          </div>
          
          <h2 className="text-4xl md:text-6xl xl:text-7xl font-black text-white breathe-md leading-tight text-balance reading-width-wide">
            Meet Your <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">24/7</span>
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent relative">
              Booking Assistant
              <div className="absolute -inset-2 bg-gradient-to-r from-emerald-400/15 to-green-400/15 blur-2xl -z-10 animate-breathe"></div>
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-slate-300 reading-width leading-relaxed font-light text-pretty">
            <span className="md:hidden">AI that never sleeps, never misses bookings.</span>
            <span className="hidden md:inline">The AI that never sleeps, never misses a lead, and books appointments 
            faster than any human could.</span>
          </p>
        </div>
        
        {/* Desktop: Enhanced grid layout with consistent sizing */}
        <div className="hidden md:grid md:grid-cols-1 lg:grid-cols-3 gap-golden-lg">
          {features.map((feature, index) => (
            <div key={index} className="group relative animate-fade-in-luxury" style={{ animationDelay: `${index * 0.15}s` }}>
              {/* Luxury card background */}
              <div className="absolute inset-0 glass-subtle rounded-3xl shadow-luxury-md group-hover:shadow-luxury-lg transition-luxury"></div>
              <div className="relative text-center p-8 md:p-10 transition-luxury group-hover:-translate-y-2 h-full flex flex-col">
                <div className="relative mb-8 md:mb-10 flex justify-center flex-shrink-0">
                  <div className={`w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br ${feature.color} rounded-full flex items-center justify-center shadow-luxury-lg group-hover:shadow-luxury-xl transition-luxury group-hover:shadow-emerald-500/25`}>
                    <feature.icon className="w-10 h-10 md:w-12 md:h-12 text-white group-hover:scale-110 transition-all duration-300" strokeWidth={1.5} />
                  </div>
                  {/* Subtle background glow */}
                  <div className={`absolute inset-0 w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br ${feature.color} rounded-full opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-500`}></div>
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 md:mb-6 leading-tight group-hover:text-emerald-100 transition-colors duration-300 text-balance">
                      {feature.title}
                    </h3>
                    <p className="text-slate-300 text-lg md:text-xl leading-relaxed group-hover:text-slate-100 transition-colors duration-300 mb-6 md:mb-8 text-pretty">
                      {feature.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-center text-emerald-400 font-semibold text-base md:text-lg group-hover:text-emerald-300 transition-colors duration-300">
                    <Clock className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 group-hover:rotate-12 transition-transform duration-300" />
                    <span>{feature.stat}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile: Enhanced carousel with luxury styling */}
        <div className="md:hidden">
          <div 
            ref={solutionCarouselRef}
            className="overflow-x-auto snap-x snap-mandatory scroll-smooth overscroll-x-contain"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <div className="flex pb-6">
              {features.map((feature, index) => (
                <div key={index} className="w-[calc(100vw-2rem)] flex-none snap-start snap-always mx-4">
                  <div className="glass-subtle rounded-3xl p-6 text-center h-full shadow-luxury-sm">
                    <div className="relative mb-6 flex justify-center">
                      <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-full flex items-center justify-center shadow-luxury-md`}>
                        <feature.icon className="w-6 h-6 text-white" strokeWidth={1.5} />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-4 leading-tight">
                      {feature.title}
                    </h3>
                    <p className="text-slate-300 text-sm leading-relaxed mb-4">
                      {feature.mobileDescription || feature.description}
                    </p>
                    <div className="flex items-center justify-center text-emerald-400 font-semibold text-sm">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>{feature.stat}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Enhanced carousel indicators */}
          <div className="flex justify-center space-x-3 mt-8">
            {features.map((_, index) => (
              <button
                key={index}
                onClick={() => handleSolutionIndicatorClick(index)}
                className={`h-3 rounded-full transition-luxury ${
                  index === activeSolutionIndex
                    ? 'bg-emerald-400 w-8 shadow-luxury-sm'
                    : 'bg-slate-600 w-3 hover:bg-slate-500 hover:shadow-luxury-sm'
                }`}
                aria-label={`Go to solution ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </EnhancedScrollSection>
  );
};

export default Solution;
