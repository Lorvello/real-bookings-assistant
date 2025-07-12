import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle, Sparkles, TrendingUp, Clock, Users, Zap } from 'lucide-react';

const ResultSummary = () => {
  const [activeStatIndex, setActiveStatIndex] = useState(0);
  const statsCarouselRef = useRef<HTMLDivElement>(null);

  // Handle stats carousel scroll
  useEffect(() => {
    const carousel = statsCarouselRef.current;
    if (!carousel) return;

    const handleScroll = () => {
      const scrollLeft = carousel.scrollLeft;
      const itemWidth = carousel.children[0]?.clientWidth || 0;
      const newIndex = Math.round(scrollLeft / itemWidth);
      setActiveStatIndex(newIndex);
    };

    carousel.addEventListener('scroll', handleScroll, { passive: true });
    return () => carousel.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle carousel indicator click
  const handleStatIndicatorClick = (index: number) => {
    const carousel = statsCarouselRef.current;
    if (!carousel) return;
    
    const itemWidth = carousel.children[0]?.clientWidth || 0;
    carousel.scrollTo({
      left: index * itemWidth,
      behavior: 'smooth'
    });
  };

  const stats = [
    { 
      value: '98%', 
      label: 'Higher open rates vs email', 
      icon: Clock
    },
    { 
      value: '40%', 
      label: 'Reduction in service costs', 
      icon: Users
    },
    { 
      value: '10x', 
      label: 'Return on investment potential', 
      icon: TrendingUp
    },
    { 
      value: '24/7', 
      label: 'Automated availability', 
      icon: Zap
    }
  ];

  return (
    <div className="relative">
      <div className="relative rounded-3xl p-3 md:p-8">
        {/* Single elegant header */}
        <div className="text-center mb-20 md:mb-24">
          <h2 className="text-2xl md:text-3xl font-light text-slate-200 tracking-wide">
            Drive exceptional results across every business metric
          </h2>
        </div>
        
        {/* Desktop: Premium grid layout */}
        <div className="hidden md:grid sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-16">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            
            return (
              <div 
                key={index} 
                className="group relative bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-3xl p-12 lg:p-16 text-center transition-all duration-700 hover:scale-105 hover:-translate-y-3"
                style={{
                  boxShadow: `
                    0 25px 50px -12px rgba(0, 0, 0, 0.25),
                    0 35px 75px -15px rgba(0, 0, 0, 0.15),
                    0 0 0 1px rgba(16, 185, 129, 0.05),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1),
                    0 0 40px rgba(16, 185, 129, 0.1)
                  `
                }}
              >
                {/* Enhanced glassmorphism overlay */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-emerald-500/10 via-emerald-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700" />
                <div className="absolute inset-0 rounded-3xl bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-all duration-700" />
                
                <div className="relative z-10">
                  <div className="mb-10">
                    <Icon className="w-14 h-14 mx-auto text-emerald-400 drop-shadow-xl group-hover:drop-shadow-2xl transition-all duration-700 group-hover:scale-110" />
                  </div>
                  
                  <div className="text-6xl lg:text-7xl font-black text-emerald-400 mb-8 tracking-tighter drop-shadow-xl group-hover:drop-shadow-2xl transition-all duration-700">
                    {stat.value}
                  </div>
                  
                  <div className="text-base lg:text-lg text-slate-300 leading-relaxed font-light tracking-wide">
                    {stat.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile: Improved horizontal slideshow */}
        <div className="md:hidden">
          <div 
            ref={statsCarouselRef}
            className="overflow-x-auto snap-x snap-mandatory scroll-smooth overscroll-x-contain perfect-snap-carousel"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <div className="flex gap-4 pb-4 px-2">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="w-[85vw] flex-none snap-start snap-always">
                    <div 
                      className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-3xl p-10 text-center h-full"
                      style={{
                        boxShadow: `
                          0 20px 40px -10px rgba(0, 0, 0, 0.2),
                          0 25px 50px -12px rgba(0, 0, 0, 0.15),
                          0 0 0 1px rgba(16, 185, 129, 0.05),
                          inset 0 1px 0 rgba(255, 255, 255, 0.1)
                        `
                      }}
                    >
                      <div className="mb-8">
                        <Icon className="w-10 h-10 mx-auto text-emerald-400 drop-shadow-xl" />
                      </div>
                      
                      <div className="text-4xl font-black text-emerald-400 mb-6 tracking-tighter drop-shadow-xl">
                        {stat.value}
                      </div>
                      
                      <div className="text-sm text-slate-300 leading-relaxed font-light tracking-wide">
                        {stat.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Interactive carousel indicators */}
          <div className="flex justify-center space-x-2 mt-4">
            {stats.map((_, index) => (
              <button
                key={index}
                onClick={() => handleStatIndicatorClick(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === activeStatIndex
                    ? 'bg-emerald-400 w-6'
                    : 'bg-slate-600 hover:bg-slate-500'
                }`}
                aria-label={`Go to stat ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultSummary;
