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
      value: '95%', 
      label: 'Less time on administration', 
      icon: Clock
    },
    { 
      value: '24/7', 
      label: 'Available for customers', 
      icon: Users
    },
    { 
      value: '0', 
      label: 'Missed appointments', 
      icon: TrendingUp
    },
    { 
      value: '∞', 
      label: 'Simultaneous conversations', 
      icon: Zap
    }
  ];

  return (
    <div className="relative">
      <div className="relative rounded-3xl p-3 md:p-8">
        {/* Single elegant header */}
        <div className="text-center mb-16 md:mb-20">
          <h2 className="text-2xl md:text-3xl font-light text-slate-200 tracking-wide">
            Transform your business with these
            <span className="text-emerald-400 font-medium"> results</span>
          </h2>
        </div>
        
        {/* Desktop: Premium grid layout */}
        <div className="hidden md:grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            
            return (
              <div 
                key={index} 
                className="group relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-3xl p-10 lg:p-12 text-center transition-all duration-500 hover:scale-105 hover:-translate-y-2"
                style={{
                  boxShadow: `
                    0 4px 6px -1px rgba(0, 0, 0, 0.1),
                    0 10px 15px -3px rgba(0, 0, 0, 0.1),
                    0 20px 25px -5px rgba(0, 0, 0, 0.1),
                    0 0 0 1px rgba(255, 255, 255, 0.05),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1)
                  `
                }}
              >
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10">
                  <div className="mb-8">
                    <Icon className="w-12 h-12 mx-auto text-emerald-400 drop-shadow-lg" />
                  </div>
                  
                  <div className="text-5xl lg:text-6xl font-bold text-emerald-400 mb-6 tracking-tight drop-shadow-lg">
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
            <div className="flex gap-3 pb-4 px-2">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="w-[85vw] flex-none snap-start snap-always">
                    <div 
                      className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-3xl p-8 text-center h-full"
                      style={{
                        boxShadow: `
                          0 4px 6px -1px rgba(0, 0, 0, 0.1),
                          0 10px 15px -3px rgba(0, 0, 0, 0.1),
                          0 20px 25px -5px rgba(0, 0, 0, 0.1),
                          0 0 0 1px rgba(255, 255, 255, 0.05)
                        `
                      }}
                    >
                      <div className="mb-6">
                        <Icon className="w-8 h-8 mx-auto text-emerald-400 drop-shadow-lg" />
                      </div>
                      
                      <div className="text-3xl font-bold text-emerald-400 mb-4 tracking-tight drop-shadow-lg">
                        {stat.value}
                      </div>
                      
                      <div className="text-sm text-slate-300 leading-relaxed font-light">
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
