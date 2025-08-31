import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ServiceType, InstallmentOption } from '@/types/calendar';
import { CreditCard, Clock, Euro, Settings } from 'lucide-react';
interface ServiceTypeStripeConfigProps {
  serviceType: ServiceType;
  onUpdate: (updates: Partial<ServiceType>) => void;
}
export const ServiceTypeStripeConfig: React.FC<ServiceTypeStripeConfigProps> = ({
  serviceType,
  onUpdate
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasStripeIntegration = serviceType.stripe_test_price_id || serviceType.stripe_live_price_id;
  const defaultInstallmentOptions: InstallmentOption[] = [{
    id: '50-50',
    name: '50% nu, 50% bij afspraak',
    description: 'Betaal de helft nu en de helft op de dag van de afspraak',
    payments: [{
      order: 1,
      percentage: 50,
      amount: (serviceType.price || 0) * 0.5,
      due_days: 0,
      description: 'Vooruitbetaling'
    }, {
      order: 2,
      percentage: 50,
      amount: (serviceType.price || 0) * 0.5,
      due_days: 0,
      description: 'Restbetaling bij afspraak'
    }]
  }, {
    id: '30-70',
    name: '30% nu, 70% bij afspraak',
    description: 'Betaal 30% nu als aanbetaling',
    payments: [{
      order: 1,
      percentage: 30,
      amount: (serviceType.price || 0) * 0.3,
      due_days: 0,
      description: 'Aanbetaling'
    }, {
      order: 2,
      percentage: 70,
      amount: (serviceType.price || 0) * 0.7,
      due_days: 0,
      description: 'Restbetaling bij afspraak'
    }]
  }];
  const handleInstallmentToggle = (enabled: boolean) => {
    onUpdate({
      supports_installments: enabled,
      installment_options: enabled ? defaultInstallmentOptions : []
    });
  };

  // Only show if there's actual Stripe integration
  if (!hasStripeIntegration) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Stripe Integratie
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Termijnbetalingen</label>
              <p className="text-xs text-muted-foreground">
                Sta klanten toe om in termijnen te betalen
              </p>
            </div>
            <Switch
              checked={serviceType.supports_installments || false}
              onCheckedChange={handleInstallmentToggle}
            />
          </div>
          
          {serviceType.supports_installments && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Beschikbare opties:</h4>
              <div className="space-y-2">
                {serviceType.installment_options?.map((option, index) => (
                  <div key={option.id || index} className="p-2 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{option.name}</span>
                      <Badge variant="outline">
                        <Euro className="h-3 w-3 mr-1" />
                        {option.payments.length} betalingen
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};