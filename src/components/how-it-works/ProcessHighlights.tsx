
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
      <div className="max-w-4xl mx-auto mt-20">
        <div className="space-y-12">
          <StepIndicator />
          <StepOneDetails />
          <StepTwoDetails />
          <StepThreeDetails />
          <ResultSummary />
        </div>
      </div>
    </ScrollAnimatedSection>
  );
};

export default ProcessHighlights;
