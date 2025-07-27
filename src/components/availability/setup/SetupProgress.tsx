import React from 'react';
import { Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { SetupStep } from '@/types/availability';

interface SetupProgressProps {
  steps: SetupStep[];
  currentStepIndex: number;
}

export const SetupProgress: React.FC<SetupProgressProps> = ({ 
  steps, 
  currentStepIndex 
}) => {
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Step {currentStepIndex + 1} of {steps.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Indicators */}
      <div className="flex justify-center space-x-2">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
              step.completed
                ? 'bg-primary border-primary text-primary-foreground'
                : step.current
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-border text-muted-foreground bg-background'
            }`}
          >
            {step.completed ? (
              <Check className="h-4 w-4" />
            ) : (
              <span className="text-sm font-medium">{index + 1}</span>
            )}
          </div>
        ))}
      </div>

      {/* Current Step Info */}
      <div className="text-center space-y-1">
        <h3 className="text-lg font-semibold">
          {steps[currentStepIndex]?.title}
        </h3>
        <p className="text-sm text-muted-foreground">
          {steps[currentStepIndex]?.description}
        </p>
      </div>
    </div>
  );
};