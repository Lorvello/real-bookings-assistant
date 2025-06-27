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
      <div className="relative border border-slate-700 rounded-3xl p-3 md:p-12 lg:p-16">
        {/* Header - much smaller on mobile */}
        <div className="text-center mb-6 md:mb-12">
          <div className="flex items-center justify-center gap-3 md:gap-6 mb-4 md:mb-8">
            <CheckCircle className="w-6 h-6 md:w-12 md:h-12 text-emerald-400" />
            <div className="flex items-center gap-2 md:gap-4">
              <span className="text-xl md:text-4xl lg:text-5xl font-bold text-white">The result:</span>
              <Sparkles className="w-4 h-4 md:w-8 md:h-8 text-emerald-400" />
            </div>
          </div>
        </div>
        
        {/* Main description - cleaner text formatting */}
        <div className="max-w-5xl mx-auto text-center mb-6 md:mb-16">
          <p className="text-sm md:text-2xl lg:text-3xl text-slate-200 leading-relaxed mb-4 md:mb-8">
            From now on, you{' '}
            <span className="text-red-400 font-bold">never again</span>
            {' '}have to waste time going back and forth messaging about appointments.
          </p>
          
          <p className="text-sm md:text-xl lg:text-2xl text-slate-200">
            You get{' '}
            <span className="text-emerald-400 font-bold">more bookings</span>,{' '}
            <span className="text-emerald-400 font-bold">happier customers</span>, and{' '}
            <span className="text-emerald-400 font-bold">more time</span>
            {' '}for what really matters.
          </p>
        </div>
        
        {/* Desktop: Grid layout - keep existing */}
        <div className="hidden md:grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            
            return (
              <div key={index} className="border border-slate-600 rounded-2xl p-8 lg:p-10 text-center">
                <Icon className="w-8 h-8 mx-auto text-emerald-400 mb-6" />
                
                <div className="text-4xl lg:text-5xl font-bold text-emerald-400 mb-4">
                  {stat.value}
                </div>
                
                <div className="text-sm lg:text-base text-slate-300 leading-tight">
                  {stat.label}
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
                    <div className="border border-slate-600 rounded-2xl p-6 text-center h-full">
                      <Icon className="w-6 h-6 mx-auto text-emerald-400 mb-4" />
                      
                      <div className="text-2xl font-bold text-emerald-400 mb-3">
                        {stat.value}
                      </div>
                      
                      <div className="text-xs text-slate-300 leading-tight">
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
