
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
        <div className="space-y-8 md:space-y-12">
          <StepIndicator />
          
          {/* Desktop: Sequential scroll-triggered animated layout with clean cards */}
          <div className="hidden md:block">
            <div className="space-y-16">
              <ScrollAnimatedSection animation="slide-left" delay={200} className="shadow-lg hover:shadow-xl transition-all duration-500">
                <StepOneDetails />
              </ScrollAnimatedSection>
              <ScrollAnimatedSection animation="slide-left" delay={400} className="shadow-lg hover:shadow-xl transition-all duration-500">
                <StepTwoDetails />
              </ScrollAnimatedSection>
              <ScrollAnimatedSection animation="slide-left" delay={600} className="shadow-lg hover:shadow-xl transition-all duration-500">
                <StepThreeDetails />
              </ScrollAnimatedSection>
            </div>
          </div>

          {/* Mobile: Clean vertical layout with scroll-triggered modern cards */}
          <div className="md:hidden space-y-8">
            {steps.map((step, index) => {
              const StepComponent = step.component;
              return (
                <ScrollAnimatedSection 
                  key={index} 
                  animation="slide-left" 
                  delay={200 + index * 200}
                  className="shadow-lg"
                >
                  <StepComponent />
                </ScrollAnimatedSection>
              );
            })}
          </div>
          
          <ScrollAnimatedSection animation="fade-up" delay={400}>
            <ResultSummary />
          </ScrollAnimatedSection>
        </div>
      </div>
    </ScrollAnimatedSection>
  );
};

export default ProcessHighlights;
