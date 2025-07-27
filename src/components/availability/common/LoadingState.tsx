import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = 'Loading...', 
  className = 'h-96' 
}) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-base font-medium text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};