import React from 'react';
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
              className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1"
            >
              <Check className="h-3 w-3" />
              Payment Ready
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>This service is linked to Stripe and ready to accept payments</p>
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
            className="bg-amber-500/10 text-amber-500 border-amber-500/30 gap-1"
          >
            <AlertTriangle className="h-3 w-3" />
            Not linked to Stripe
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Connect Stripe to enable payments for this service</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
