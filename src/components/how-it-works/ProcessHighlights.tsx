
import React from 'react';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';
import StepIndicator from './StepIndicator';
import StepOneDetails from './StepOneDetails';
import StepTwoDetails from './StepTwoDetails';
import StepThreeDetails from './StepThreeDetails';
import ResultSummary from './ResultSummary';

const ProcessHighlights = () => {
  return (
    <ScrollAnimatedSection>
      <div className="max-w-7xl mx-auto mt-20">
        {/* Main Title Section */}
        <StepIndicator />
        
        {/* Steps Container with Clear Separation */}
        <div className="mt-24 space-y-32">
          <StepOneDetails />
          <StepTwoDetails />
          <StepThreeDetails />
        </div>
        
        {/* Result Section */}
        <div className="mt-32">
          <ResultSummary />
        </div>
      </div>
    </ScrollAnimatedSection>
  );
};

export default ProcessHighlights;
