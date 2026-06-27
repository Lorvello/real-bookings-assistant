import React from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, AlertTriangle, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StripeStatusBadgeProps {
  price?: number;
  stripeTestPriceId?: string | null;
  stripeLivePriceId?: string | null;
}

export function StripeStatusBadge({ 
  price, 
  stripeTestPriceId, 
  stripeLivePriceId
}: StripeStatusBadgeProps) {
  const { t } = useTranslation('settings');
  // Free services don't need Stripe
  if (!price || price === 0) {
    return null;
  }

  const hasStripeLink = !!(stripeTestPriceId || stripeLivePriceId);

  if (hasStripeLink) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className="bg-success/10 text-success-foreground border-success/30 gap-1"
            >
              <Check className="h-3 w-3" />
              {t('settings.services.stripe.paymentReady', 'Payment Ready')}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('settings.services.stripe.paymentReadyTooltip', 'This service is linked to Stripe and ready to accept payments')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="gap-1 border-warning/30 bg-warning/10 text-warning-foreground"
          >
            <AlertTriangle className="h-3 w-3" />
            {t('settings.services.stripe.notLinked', 'Not linked to Stripe')}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('settings.services.stripe.notLinkedTooltip', 'Connect Stripe to enable payments for this service')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
