
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
      <div className="max-w-6xl mx-auto mt-4 md:mt-8 px-4 md:px-6 lg:px-8">
        <div className="space-y-6 md:space-y-12">
          <StepIndicator />
          
          {/* Desktop: Sequential animated layout with clean cards */}
          <div className="hidden md:block">
            <div className="space-y-16">
              <div 
                className="animate-fade-in shadow-lg hover:shadow-xl transition-all duration-500"
                style={{
                  animationDelay: '600ms',
                  animationFillMode: 'both'
                }}
              >
                <StepOneDetails />
              </div>
              <div 
                className="animate-fade-in shadow-lg hover:shadow-xl transition-all duration-500"
                style={{
                  animationDelay: '900ms',
                  animationFillMode: 'both'
                }}
              >
                <StepTwoDetails />
              </div>
              <div 
                className="animate-fade-in shadow-lg hover:shadow-xl transition-all duration-500"
                style={{
                  animationDelay: '1200ms',
                  animationFillMode: 'both'
                }}
              >
                <StepThreeDetails />
              </div>
            </div>
          </div>

          {/* Mobile: Clean vertical layout with modern cards */}
          <div className="md:hidden space-y-8">
            {steps.map((step, index) => {
              const StepComponent = step.component;
              return (
                <div 
                  key={index} 
                  className="shadow-lg"
                  style={{
                    animationDelay: `${600 + index * 300}ms`,
                    animationFillMode: 'both'
                  }}
                >
                  <StepComponent />
                </div>
              );
            })}
          </div>
          
          <div 
            className="animate-fade-in"
            style={{
              animationDelay: '1500ms',
              animationFillMode: 'both'
            }}
          >
            <ResultSummary />
          </div>
        </div>
      </div>
    </ScrollAnimatedSection>
  );
};

export default ProcessHighlights;
