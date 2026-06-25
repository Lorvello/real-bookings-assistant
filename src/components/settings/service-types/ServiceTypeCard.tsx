
import React from 'react';
import { Clock, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ServiceType } from '@/types/calendar';
import { TaxBadge } from '@/components/tax/TaxBadge';
import { StripeStatusBadge } from './StripeStatusBadge';

interface ServiceTypeCardProps {
  service: ServiceType;
  onEdit: (service: ServiceType) => void;
  onDelete: (id: string) => void;
}

export function ServiceTypeCard({ service, onEdit, onDelete }: ServiceTypeCardProps) {
  const formatPrice = (price?: number) => {
    if (!price) return 'Free';
    return `€${price.toFixed(2)}`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}min`;
  };

  return (
    <Card className="group relative flex h-full flex-col border-white/[0.06] transition-colors hover:border-white/15 hover:bg-white/[0.015]">
      <CardContent className="flex flex-1 flex-col p-4">
        {/* Header: color + name. On desktop the actions are hover-revealed and float
            top-right so they never reserve layout width (which would truncate short
            names prematurely). On mobile the actions are always visible, so the title
            row reserves their width (pr-24) to keep a long name from sliding under them. */}
        <div className="mb-3 flex min-w-0 items-center gap-2.5 pr-24 md:pr-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/10"
            style={{ backgroundColor: service.color }}
            aria-hidden="true"
          />
          <h3 className="truncate font-medium text-foreground">{service.name}</h3>
        </div>
        <div className="absolute right-3 top-3 flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 min-w-11 p-0 text-muted-foreground hover:text-foreground md:min-w-0"
              onClick={() => onEdit(service)}
              aria-label={`Edit ${service.name}`}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 min-w-11 p-0 text-muted-foreground hover:text-destructive-foreground md:min-w-0"
              onClick={() => onDelete(service.id)}
              aria-label={`Delete ${service.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
        </div>

        {/* Description */}
        {service.description && (
          <p className="mb-3 line-clamp-2 text-sm leading-5 text-muted-foreground">
            {service.description}
          </p>
        )}

        {/* Meta: duration · price, pushed to the bottom for an even grid */}
        <div className="mt-auto flex items-center gap-2 pt-1 text-sm">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(service.duration)}
          </span>
          <span className="text-subtle-foreground">·</span>
          <span className="font-medium text-foreground">{formatPrice(service.price)}</span>
        </div>

        {/* Status badges (Stripe shows only for paid services, Tax only when enabled) */}
        {(!!service.price || service.tax_enabled) ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StripeStatusBadge
              price={service.price}
              stripeTestPriceId={(service as any).stripe_test_price_id}
              stripeLivePriceId={(service as any).stripe_live_price_id}
            />
            <TaxBadge
              taxEnabled={service.tax_enabled || false}
              taxBehavior={service.tax_behavior}
              taxCode={service.tax_code}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
