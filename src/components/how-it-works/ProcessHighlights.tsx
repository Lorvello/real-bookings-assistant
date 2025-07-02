
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

          {/* Mobile: Vertical layout with increased spacing */}
          <div className="md:hidden space-y-16">
            {steps.map((step, index) => {
              const StepComponent = step.component;
              return (
                <div key={index} className="bg-slate-800/30 rounded-2xl p-6">
                  <StepComponent />
                </div>
              );
            })}
          </div>
          
          <ResultSummary />
        </div>
      </div>
    </ScrollAnimatedSection>
  );
};

export default ProcessHighlights;
