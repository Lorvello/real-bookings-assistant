
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface SetupProgressIndicatorProps {
  completedSteps: number;
  totalSteps: number;
}

export const SetupProgressIndicator: React.FC<SetupProgressIndicatorProps> = ({
  completedSteps,
  totalSteps
}) => {
  const progressPercentage = (completedSteps / totalSteps) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Overall Progress</span>
        <span>{Math.round(progressPercentage)}%</span>
      </div>
      <Progress value={progressPercentage} className="h-2" />
    </div>
  );
};
