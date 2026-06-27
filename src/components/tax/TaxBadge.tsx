import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('settings');
  if (!taxEnabled) {
    return (
      <Badge variant="secondary" className={cn("text-xs", className)}>
        {t('settings.services.tax.off', 'Tax: Off')}
      </Badge>
    );
  }

  const taxLabel = taxBehavior === 'inclusive' ? t('settings.services.tax.inclusive', 'VAT: Inclusive') : t('settings.services.tax.exclusive', 'VAT: Exclusive');
  const codeLabel = taxCode ? TAX_CODE_LABELS[taxCode] || t('settings.services.tax.codes.codeSet', 'Tax Code Set') : '';

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