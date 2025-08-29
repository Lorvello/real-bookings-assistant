import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TaxBadgeProps {
  taxEnabled: boolean;
  taxBehavior?: 'inclusive' | 'exclusive';
  taxCode?: string;
  className?: string;
}

const TAX_CODE_LABELS: Record<string, string> = {
  'txcd_10000000': 'General Services',
  'txcd_99999999': 'Professional Services',
  'txcd_10401000': 'Digital Services',
  'txcd_10103000': 'Software Services',
  'txcd_10502001': 'Consulting Services',
  'txcd_20030000': 'Educational Services'
};

export function TaxBadge({ taxEnabled, taxBehavior, taxCode, className }: TaxBadgeProps) {
  if (!taxEnabled) {
    return (
      <Badge variant="secondary" className={cn("text-xs", className)}>
        Tax: Off
      </Badge>
    );
  }

  const taxLabel = taxBehavior === 'inclusive' ? 'VAT: Inclusive' : 'VAT: Exclusive';
  const codeLabel = taxCode ? TAX_CODE_LABELS[taxCode] || 'Tax Code Set' : '';

  return (
    <div className="flex flex-wrap gap-1">
      <Badge 
        variant={taxBehavior === 'inclusive' ? 'default' : 'outline'} 
        className={cn("text-xs", className)}
      >
        {taxLabel}
      </Badge>
      {codeLabel && (
        <Badge variant="secondary" className="text-xs">
          {codeLabel}
        </Badge>
      )}
    </div>
  );
}