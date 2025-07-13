import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle, Sparkles, TrendingUp, Clock, Users, Zap } from 'lucide-react';

const ResultSummary = () => {
  const [activeStatIndex, setActiveStatIndex] = useState(0);
  const [flippedCards, setFlippedCards] = useState<boolean[]>([false, false, false, false]);
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

  // Handle card flip toggle
  const toggleCardFlip = (index: number) => {
    setFlippedCards(prev => {
      const newFlippedCards = [...prev];
      newFlippedCards[index] = !newFlippedCards[index];
      return newFlippedCards;
    });
  };

  const stats = [
    { 
      value: '98%', 
      label: 'Higher open rates vs email', 
      icon: Clock,
      detailText: "WhatsApp messages achieve 98% open rates compared to just 20% for email marketing. This 5x improvement in reach translates to 45-60% conversion rates vs 2-5% for traditional methods. 57% of messages receive replies within 1 minute."
    },
    { 
      value: '40%', 
      label: 'Reduction in service costs', 
      icon: Users,
      detailText: "Businesses report 30-40% reductions in customer service costs while improving quality. Staff productivity increases 75% with 3x booking efficiency. 70% of inquiries handled without human intervention."
    },
    { 
      value: '10x', 
      label: 'Return on investment potential', 
      icon: TrendingUp,
      detailText: "Companies like Tata CLiQ achieved 10x ROI generating $500k in WhatsApp sales monthly. 89% uplift in purchases per user, 72% higher sessions. 60-80% reduction in customer acquisition costs."
    },
    { 
      value: '24/7', 
      label: 'Automated availability', 
      icon: Zap,
      detailText: "Automated systems provide round-the-clock availability without staffing costs. 90% of users respond within 30 minutes vs 12-hour email response times. 42% higher 6-month retention rates."
    }
  ];

  return (
    <div className="relative">
      <div className="relative rounded-3xl p-3 md:p-8">
        {/* Powerful direct header */}
        <div className="text-center mb-20 md:mb-24">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black bg-gradient-to-r from-white via-slate-100 to-emerald-200 bg-clip-text text-transparent tracking-wide leading-tight drop-shadow-2xl">
            Proven results that transform businesses
          </h2>
        </div>
        
        {/* Desktop: Premium 4-card horizontal row layout with flip functionality */}
        <div className="hidden md:grid grid-cols-4 gap-8 lg:gap-12 max-w-6xl mx-auto" style={{ perspective: '1000px' }}>
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const isFlipped = flippedCards[index];
            
            return (
              <div 
                key={index} 
                className={`group relative aspect-square cursor-pointer transition-all duration-700 ${!isFlipped ? 'hover:scale-105 hover:-translate-y-4' : ''}`}
                onClick={() => toggleCardFlip(index)}
              >
                {/* Flip Container */}
                <div 
                  className="relative w-full h-full transition-transform duration-600 ease-in-out"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                  }}
                >
                  {/* Front Side */}
                  <div 
                    className="absolute inset-0 w-full h-full bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-6 lg:p-8 text-center flex flex-col justify-center items-center"
                    style={{
                      backfaceVisibility: 'hidden',
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
                      <div className="mb-4">
                        <Icon className="w-8 h-8 lg:w-10 lg:h-10 mx-auto text-emerald-400 drop-shadow-2xl group-hover:drop-shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all duration-700 group-hover:scale-110" />
                      </div>
                      
                      {/* Large prominent statistic */}
                      <div className="text-2xl lg:text-3xl xl:text-4xl font-black text-emerald-400 mb-3 lg:mb-4 tracking-tighter drop-shadow-2xl group-hover:drop-shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all duration-700">
                        {stat.value}
                      </div>
                      
                      {/* Subtle descriptive text */}
                      <div className="text-xs lg:text-xs text-slate-300/90 leading-tight font-light tracking-wide text-center max-w-full">
                        {stat.label}
                      </div>
                    </div>
                  </div>

                  {/* Back Side */}
                  <div 
                    className="absolute inset-0 w-full h-full bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-1 text-center flex flex-col justify-center items-center overflow-hidden"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      boxShadow: `
                        0 30px 60px -12px rgba(0, 0, 0, 0.35),
                        0 40px 80px -15px rgba(0, 0, 0, 0.25),
                        0 0 0 1px rgba(16, 185, 129, 0.08),
                        inset 0 1px 0 rgba(255, 255, 255, 0.15),
                        0 0 50px rgba(16, 185, 129, 0.15)
                      `
                    }}
                  >
                    {/* Back side glassmorphism overlay */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-emerald-500/15 via-emerald-400/8 to-transparent" />
                    <div className="absolute inset-0 rounded-2xl bg-white/[0.03]" />
                    
                    <div className="relative z-10 flex items-start justify-start h-full w-full p-2">
                      {/* Detailed text with larger font and top-left aligned - no icon */}
                      <div className="text-[13px] lg:text-[14px] text-slate-300/90 leading-tight font-light tracking-wide text-left">
                        {stat.detailText}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile: 2x2 square grid layout with flip functionality */}
        <div className="md:hidden grid grid-cols-2 gap-8 max-w-md mx-auto" style={{ perspective: '1000px' }}>
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const isFlipped = flippedCards[index];
            
            return (
              <div 
                key={index} 
                className="relative aspect-square cursor-pointer"
                onClick={() => toggleCardFlip(index)}
              >
                {/* Mobile Flip Container */}
                <div 
                  className="relative w-full h-full transition-transform duration-600 ease-in-out"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                  }}
                >
                  {/* Mobile Front Side */}
                  <div 
                    className="absolute inset-0 w-full h-full bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-6 text-center flex flex-col justify-center items-center"
                    style={{
                      backfaceVisibility: 'hidden',
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

                  {/* Mobile Back Side */}
                  <div 
                    className="absolute inset-0 w-full h-full bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-1 text-center flex flex-col justify-center items-center overflow-hidden"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      boxShadow: `
                        0 25px 45px -10px rgba(0, 0, 0, 0.3),
                        0 30px 60px -12px rgba(0, 0, 0, 0.2),
                        0 0 0 1px rgba(16, 185, 129, 0.08),
                        inset 0 1px 0 rgba(255, 255, 255, 0.12)
                      `
                    }}
                  >
                    {/* Mobile back side glassmorphism overlay */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-emerald-500/15 via-emerald-400/8 to-transparent" />
                    <div className="absolute inset-0 rounded-2xl bg-white/[0.03]" />
                    
                    <div className="relative z-10 flex items-start justify-start h-full w-full p-2">
                      {/* Detailed text with larger font and top-left aligned for mobile - no icon */}
                      <div className="text-[12px] text-slate-300/90 leading-tight font-light tracking-wide text-left">
                        {stat.detailText}
                      </div>
                    </div>
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
