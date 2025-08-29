import React from 'react';
import { Badge } from '@/components/ui/badge';

interface InstallmentPlan {
  type: 'preset' | 'custom';
  preset?: '50_50' | '25_25_50' | 'fixed_deposit';
  deposits?: Array<{
    percentage?: number;
    amount?: number;
    timing: 'now' | 'appointment' | 'days_after';
  }>;
}

interface InstallmentBadgeProps {
  enabled: boolean;
  plan?: InstallmentPlan;
  isOverride?: boolean;
}

export function InstallmentBadge({ enabled, plan, isOverride }: InstallmentBadgeProps) {
  if (!enabled) {
    return (
      <Badge variant="secondary" className="text-xs">
        No Installments
      </Badge>
    );
  }

  const getPlanLabel = () => {
    if (!plan) return 'Default';
    
    if (plan.type === 'preset') {
      switch (plan.preset) {
        case '50_50':
          return '50/50';
        case '25_25_50':
          return '25/25/50';
        case 'fixed_deposit':
          return 'Deposit';
        default:
          return 'Preset';
      }
    }
    
    return 'Custom';
  };

  return (
    <div className="flex gap-1">
      <Badge variant="default" className="text-xs">
        Installments: On
      </Badge>
      <Badge variant="outline" className="text-xs">
        {isOverride ? 'Override: ' : ''}{getPlanLabel()}
      </Badge>
    </div>
  );
}