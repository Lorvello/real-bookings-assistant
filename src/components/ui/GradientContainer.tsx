
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
      glow: 'bg-gradient-to-br from-primary/15 via-primary/8 to-transparent',
      container: 'bg-gradient-to-br from-card/95 via-card/85 to-card/70',
      border: 'border-primary/15'
    },
    blue: {
      glow: 'bg-gradient-to-br from-blue-500/15 via-blue-500/8 to-transparent',
      container: 'bg-gradient-to-br from-card/95 via-card/85 to-card/70',
      border: 'border-blue-500/15'
    },
    purple: {
      glow: 'bg-gradient-to-br from-purple-500/15 via-purple-500/8 to-transparent',
      container: 'bg-gradient-to-br from-card/95 via-card/85 to-card/70',
      border: 'border-purple-500/15'
    },
    cyan: {
      glow: 'bg-gradient-to-br from-cyan-500/15 via-cyan-500/8 to-transparent',
      container: 'bg-gradient-to-br from-card/95 via-card/85 to-card/70',
      border: 'border-cyan-500/15'
    },
    amber: {
      glow: 'bg-gradient-to-br from-amber-500/15 via-amber-500/8 to-transparent',
      container: 'bg-gradient-to-br from-card/95 via-card/85 to-card/70',
      border: 'border-amber-500/15'
    }
  };

  const styles = variantStyles[variant];

  return (
    <div className="relative">
      <div className={`absolute -inset-3 ${styles.glow} blur-xl rounded-2xl`}></div>
      <div className={cn(
        `relative ${styles.container} backdrop-blur-xl border ${styles.border} shadow-xl rounded-2xl`,
        className
      )}>
        {children}
      </div>
    </div>
  );
}
