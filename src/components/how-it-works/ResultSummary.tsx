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
        {/* Powerful direct header */}
        <div className="text-center mb-20 md:mb-24">
          <h2 className="text-2xl md:text-3xl font-light text-slate-200 tracking-wide">
            Proven results that transform businesses
          </h2>
        </div>
        
        {/* Desktop: Premium 2x2 square grid layout */}
        <div className="hidden md:grid grid-cols-2 gap-16 lg:gap-20 max-w-4xl mx-auto">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            
            return (
              <div 
                key={index} 
                className="group relative aspect-square bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-12 lg:p-16 text-center transition-all duration-700 hover:scale-105 hover:-translate-y-4 flex flex-col justify-center items-center"
                style={{
                  boxShadow: `
                    0 30px 60px -12px rgba(0, 0, 0, 0.35),
                    0 40px 80px -15px rgba(0, 0, 0, 0.25),
                    0 0 0 1px rgba(16, 185, 129, 0.08),
                    inset 0 1px 0 rgba(255, 255, 255, 0.15),
                    0 0 50px rgba(16, 185, 129, 0.15)
                  `
                }}
              >
                {/* Enhanced glassmorphism overlay */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-emerald-500/15 via-emerald-400/8 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700" />
                <div className="absolute inset-0 rounded-2xl bg-white/[0.03] opacity-0 group-hover:opacity-100 transition-all duration-700" />
                
                <div className="relative z-10 flex flex-col items-center justify-center h-full w-full">
                  {/* Prominent icon */}
                  <div className="mb-10">
                    <Icon className="w-16 h-16 lg:w-20 lg:h-20 mx-auto text-emerald-400 drop-shadow-2xl group-hover:drop-shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all duration-700 group-hover:scale-110" />
                  </div>
                  
                  {/* Large prominent statistic */}
                  <div className="text-6xl lg:text-7xl xl:text-8xl font-black text-emerald-400 mb-8 lg:mb-10 tracking-tighter drop-shadow-2xl group-hover:drop-shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all duration-700">
                    {stat.value}
                  </div>
                  
                  {/* Subtle descriptive text */}
                  <div className="text-sm lg:text-base text-slate-300/90 leading-snug font-light tracking-wide text-center max-w-full">
                    {stat.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile: 2x2 square grid layout */}
        <div className="md:hidden grid grid-cols-2 gap-8 max-w-md mx-auto">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div 
                key={index} 
                className="aspect-square bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-6 text-center flex flex-col justify-center items-center"
                style={{
                  boxShadow: `
                    0 25px 45px -10px rgba(0, 0, 0, 0.3),
                    0 30px 60px -12px rgba(0, 0, 0, 0.2),
                    0 0 0 1px rgba(16, 185, 129, 0.08),
                    inset 0 1px 0 rgba(255, 255, 255, 0.12)
                  `
                }}
              >
                <div className="flex flex-col items-center justify-center h-full w-full">
                  {/* Prominent mobile icon */}
                  <div className="mb-6">
                    <Icon className="w-10 h-10 mx-auto text-emerald-400 drop-shadow-xl" />
                  </div>
                  
                  {/* Large mobile statistic */}
                  <div className="text-4xl font-black text-emerald-400 mb-4 tracking-tighter drop-shadow-xl">
                    {stat.value}
                  </div>
                  
                  {/* Subtle mobile text */}
                  <div className="text-xs text-slate-300/90 leading-tight font-light tracking-wide text-center">
                    {stat.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ResultSummary;
