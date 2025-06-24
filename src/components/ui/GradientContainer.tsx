
import React from 'react';
import { cn } from '@/lib/utils';

interface GradientContainerProps {
  children: React.ReactNode;
  variant?: 'primary' | 'blue' | 'purple' | 'cyan' | 'amber';
  className?: string;
}

export function GradientContainer({ 
  children, 
  variant = 'primary', 
  className 
}: GradientContainerProps) {
  const variantStyles = {
    primary: {
      container: 'bg-card/95 border-primary/20',
    },
    blue: {
      container: 'bg-card/95 border-blue-500/20',
    },
    purple: {
      container: 'bg-card/95 border-purple-500/20',
    },
    cyan: {
      container: 'bg-card/95 border-cyan-500/20',
    },
    amber: {
      container: 'bg-card/95 border-amber-500/20',
    }
  };

  const styles = variantStyles[variant];

  return (
    <div className={cn(
      `${styles.container} backdrop-blur-sm border shadow-lg rounded-xl transition-all duration-200 hover:shadow-xl`,
      className
    )}>
      {children}
    </div>
  );
}
