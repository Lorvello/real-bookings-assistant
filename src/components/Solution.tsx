
import { Button } from "@/components/ui/button";
import { MessageCircle, Brain, Target, Clock, Users, TrendingUp } from "lucide-react";
import { useState, useRef, useEffect } from "react";

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
    <section className="py-16 md:py-24 px-3 md:px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-green-500/10 rounded-full blur-3xl"></div>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header - Compact mobile */}
        <div className="text-center mb-8 md:mb-20">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 md:px-6 md:py-3 mb-3 md:mb-8 backdrop-blur-sm">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-emerald-300 text-xs md:text-sm font-medium">The Solution</span>
          </div>
          
          <h2 className="text-xl md:text-5xl xl:text-6xl font-bold text-white mb-3 md:mb-6 leading-tight px-2 md:px-0">
            Meet Your <span className="text-emerald-400">24/7</span><br />
            <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
              Booking Assistant
            </span>
          </h2>
          <p className="text-xs md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed px-3 sm:px-0">
            <span className="md:hidden">AI that never sleeps, never misses bookings.</span>
            <span className="hidden md:inline">The AI that never sleeps, never misses a lead, and books appointments 
            faster than any human could.</span>
          </p>
        </div>
        
        {/* Desktop: Grid layout */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-16">
          {features.map((feature, index) => (
            <div key={index} className="group text-center transition-all duration-300 cursor-pointer px-4 md:px-0 hover:bg-gradient-to-b hover:from-slate-800/30 hover:to-slate-800/10 rounded-2xl py-6 hover:shadow-xl hover:-translate-y-2">
              <div className="relative mb-4 md:mb-8 flex justify-center">
                <div className={`w-12 h-12 md:w-20 md:h-20 bg-gradient-to-br ${feature.color} rounded-full flex items-center justify-center shadow-md group-hover:shadow-2xl transition-all duration-300 group-hover:shadow-emerald-500/25`}>
                  <feature.icon className="w-6 h-6 md:w-10 md:h-10 text-white group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className={`text-lg md:text-2xl font-bold text-white mb-2 md:mb-4 leading-tight group-hover:text-emerald-100 transition-colors duration-300`}>
                {feature.title}
              </h3>
              <p className="text-slate-300 text-sm md:text-lg leading-relaxed max-w-sm mx-auto group-hover:text-slate-100 transition-colors duration-300 mb-3 md:mb-6">
                {feature.description}
              </p>
              <div className="flex items-center justify-center text-emerald-400 font-semibold text-xs md:text-base group-hover:text-emerald-300 transition-colors duration-300">
                <Clock className="w-3 h-3 md:w-5 md:h-5 mr-1 md:mr-2 group-hover:rotate-12 transition-transform duration-300" />
                <span>{feature.stat}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile: Perfect centered snap-scroll carousel */}
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
            <div className="flex pb-4">
              {features.map((feature, index) => (
                <div key={index} className="w-[calc(100vw-2rem)] flex-none snap-start snap-always mx-4">
                  <div className="bg-slate-800/50 rounded-2xl p-4 text-center h-full">
                    <div className="relative mb-4 flex justify-center">
                      <div className={`w-10 h-10 bg-gradient-to-br ${feature.color} rounded-full flex items-center justify-center shadow-lg`}>
                        <feature.icon className="w-5 h-5 text-white" strokeWidth={1.5} />
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-white mb-2 leading-tight">
                      {feature.title}
                    </h3>
                    <p className="text-slate-300 text-xs leading-relaxed mb-3">
                      {feature.mobileDescription || feature.description}
                    </p>
                    <div className="flex items-center justify-center text-emerald-400 font-semibold text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>{feature.stat}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Carousel indicators */}
          <div className="flex justify-center space-x-2 mt-6">
            {features.map((_, index) => (
              <button
                key={index}
                onClick={() => handleSolutionIndicatorClick(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === activeSolutionIndex
                    ? 'bg-emerald-400 w-6'
                    : 'bg-slate-600 hover:bg-slate-500'
                }`}
                aria-label={`Go to solution ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Solution;
