import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';

interface ProgressIndicatorProps {
  completionPercentage: number;
  completedSteps: number;
  totalSteps: number;
  isExpanded: boolean;
}

export function ProgressIndicator({ 
  completionPercentage, 
  completedSteps, 
  totalSteps, 
  isExpanded 
}: ProgressIndicatorProps) {
  return (
    <div className="px-3 py-2 bg-gray-700/50 rounded-lg border border-gray-600 mb-4">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="relative">
            <Circle className="h-4 w-4 text-gray-400" />
            <CheckCircle 
              className={`h-4 w-4 text-green-400 absolute top-0 left-0 transition-opacity duration-300 ${
                completionPercentage === 100 ? 'opacity-100' : 'opacity-0'
              }`} 
            />
          </div>
        </div>
        {isExpanded && (
          <div className="ml-3 min-w-0 flex-1">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-300">
                Setup Progress
              </p>
              <p className="text-xs text-gray-400">
                {completedSteps}/{totalSteps}
              </p>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-1.5">
              <div 
                className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}