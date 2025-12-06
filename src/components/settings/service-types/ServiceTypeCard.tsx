
import React from 'react';
import { Clock, Euro, Users, Edit2, Trash2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ServiceType } from '@/types/calendar';
import { TaxBadge } from '@/components/tax/TaxBadge';
import { InstallmentBadge } from './InstallmentBadge';
import { StripeStatusBadge } from './StripeStatusBadge';

interface ServiceTypeCardProps {
  service: ServiceType;
  onEdit: (service: ServiceType) => void;
  onDelete: (id: string) => void;
  onInstallmentConfig?: (service: ServiceType) => void;
}

export function ServiceTypeCard({ service, onEdit, onDelete, onInstallmentConfig }: ServiceTypeCardProps) {
  const formatPrice = (price?: number) => {
    if (!price) return 'Gratis';
    return `€${price.toFixed(2)}`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}u`;
    return `${hours}u ${remainingMinutes}min`;
  };

  return (
    <Card className="group hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        {/* Service Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="space-y-2 flex-1">
            <div className="flex items-center space-x-3">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: service.color }}
              />
              <h3 className="text-foreground font-medium truncate">{service.name}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
              <InstallmentBadge 
                enabled={!!(service as any).installments_enabled}
                plan={(service as any).custom_installment_plan ? 
                  JSON.parse((service as any).custom_installment_plan) : 
                  undefined
                }
                isOverride={!!(service as any).installments_enabled}
              />
            </div>
          </div>
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onInstallmentConfig && (
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => onInstallmentConfig(service)}>
                <MessageCircle className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => onEdit(service)}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              onClick={() => onDelete(service.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      
      {/* Service Description */}
      {service.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {service.description}
        </p>
      )}

      {/* Service Details */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center text-muted-foreground">
            <Clock className="h-4 w-4 mr-1" />
            <span>Duration:</span>
          </div>
          <span className="text-foreground font-medium">
            {formatDuration(service.duration)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center text-muted-foreground">
            <Euro className="h-4 w-4 mr-1" />
            <span>Price:</span>
          </div>
          <span className="text-foreground font-medium">
            {formatPrice(service.price)}
          </span>
        </div>
        </div>
      </CardContent>
    </Card>
  );
}
