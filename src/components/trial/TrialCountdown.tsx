import React from 'react';
import { Clock, Zap } from 'lucide-react';

interface TrialCountdownProps {
  daysRemaining: number;
  isExpanded: boolean;
}

export function TrialCountdown({ daysRemaining, isExpanded }: TrialCountdownProps) {
  const getCountdownColor = () => {
    if (daysRemaining <= 1) return 'text-red-400';
    if (daysRemaining <= 3) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getCountdownText = () => {
    if (daysRemaining === 0) return 'Trial Expires Today';
    if (daysRemaining === 1) return '1 Day Free Trial Remaining';
    return `${daysRemaining} Days Free Trial Remaining`;
  };

  return (
    <div className="px-3 py-2 bg-gray-700/50 rounded-lg border border-gray-600 mb-4">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Zap className={`h-4 w-4 ${getCountdownColor()}`} />
        </div>
        {isExpanded && (
          <div className="ml-3 min-w-0 flex-1">
            <p className={`text-xs font-medium ${getCountdownColor()}`}>
              {getCountdownText()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}