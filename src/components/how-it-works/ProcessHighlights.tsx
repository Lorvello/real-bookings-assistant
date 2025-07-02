
import React, { useState, useRef, useEffect } from 'react';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';
import StepIndicator from './StepIndicator';
import StepOneDetails from './StepOneDetails';
import StepTwoDetails from './StepTwoDetails';
import StepThreeDetails from './StepThreeDetails';
import ResultSummary from './ResultSummary';

const ProcessHighlights = () => {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const stepsCarouselRef = useRef<HTMLDivElement>(null);

  // Handle steps carousel scroll
  useEffect(() => {
    const carousel = stepsCarouselRef.current;
    if (!carousel) return;

    const handleScroll = () => {
      const scrollLeft = carousel.scrollLeft;
      const itemWidth = carousel.children[0]?.clientWidth || 0;
      const newIndex = Math.round(scrollLeft / itemWidth);
      setActiveStepIndex(newIndex);
    };

    carousel.addEventListener('scroll', handleScroll, { passive: true });
    return () => carousel.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle carousel indicator click
  const handleStepIndicatorClick = (index: number) => {
    const carousel = stepsCarouselRef.current;
    if (!carousel) return;
    
    const itemWidth = carousel.children[0]?.clientWidth || 0;
    carousel.scrollTo({
      left: index * itemWidth,
      behavior: 'smooth'
    });
  };

  const steps = [
    { component: StepOneDetails, title: "Step 1" },
    { component: StepTwoDetails, title: "Step 2" },
    { component: StepThreeDetails, title: "Step 3" }
  ];

  return (
    <ScrollAnimatedSection>
      <div className="max-w-7xl mx-auto mt-8 md:mt-20">
        <div className="space-y-8 md:space-y-16">
          <StepIndicator />
          
          {/* Desktop: Vertical layout */}
          <div className="hidden md:block">
            <div className="space-y-16">
              <StepOneDetails />
              <StepTwoDetails />
              <StepThreeDetails />
            </div>
          </div>

          {/* Mobile: Perfect snapping carousel */}
          <div className="md:hidden">
            <div 
              ref={stepsCarouselRef}
              className="overflow-x-auto snap-x snap-mandatory scroll-smooth overscroll-x-contain perfect-snap-carousel"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <div className="flex pb-4">
                {steps.map((step, index) => {
                  const StepComponent = step.component;
                  return (
                    <div key={index} className="w-[calc(100vw-2rem)] flex-none snap-start snap-always mx-4">
                      <div className="bg-slate-800/30 rounded-2xl p-4 h-full">
                        <StepComponent />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Interactive carousel indicators */}
            <div className="flex justify-center space-x-2 mt-4">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleStepIndicatorClick(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === activeStepIndex
                      ? 'bg-emerald-400 w-6'
                      : 'bg-slate-600 hover:bg-slate-500'
                  }`}
                  aria-label={`Go to step ${index + 1}`}
                />
              ))}
            </div>
          </div>
          
          <ResultSummary />
        </div>
      </div>
    </ScrollAnimatedSection>
  );
};

export default ProcessHighlights;
