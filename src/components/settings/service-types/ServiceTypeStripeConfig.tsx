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
  
  const defaultInstallmentOptions: InstallmentOption[] = [
    {
      id: '50-50',
      name: '50% nu, 50% bij afspraak',
      description: 'Betaal de helft nu en de helft op de dag van de afspraak',
      payments: [
        { order: 1, percentage: 50, amount: (serviceType.price || 0) * 0.5, due_days: 0, description: 'Vooruitbetaling' },
        { order: 2, percentage: 50, amount: (serviceType.price || 0) * 0.5, due_days: 0, description: 'Restbetaling bij afspraak' }
      ]
    },
    {
      id: '30-70',
      name: '30% nu, 70% bij afspraak',
      description: 'Betaal 30% nu als aanbetaling',
      payments: [
        { order: 1, percentage: 30, amount: (serviceType.price || 0) * 0.3, due_days: 0, description: 'Aanbetaling' },
        { order: 2, percentage: 70, amount: (serviceType.price || 0) * 0.7, due_days: 0, description: 'Restbetaling bij afspraak' }
      ]
    }
  ];

  const handleInstallmentToggle = (enabled: boolean) => {
    onUpdate({
      supports_installments: enabled,
      installment_options: enabled ? defaultInstallmentOptions : []
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Stripe Integratie
          {hasStripeIntegration && (
            <Badge variant="secondary" className="ml-auto">
              Actief
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasStripeIntegration ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Test Price ID</label>
                <div className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded">
                  {serviceType.stripe_test_price_id || 'Niet geconfigureerd'}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Live Price ID</label>
                <div className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded">
                  {serviceType.stripe_live_price_id || 'Niet geconfigureerd'}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Betaling in termijnen</label>
                  <p className="text-sm text-muted-foreground">
                    Sta klanten toe om in delen te betalen
                  </p>
                </div>
                <Switch
                  checked={serviceType.supports_installments || false}
                  onCheckedChange={handleInstallmentToggle}
                />
              </div>

              {serviceType.supports_installments && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Beschikbare betaalmogelijkheden:</h4>
                  {(serviceType.installment_options || defaultInstallmentOptions).map((option) => (
                    <div key={option.id} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium">{option.name}</h5>
                        <Badge variant="outline">
                          {option.payments.length} termijnen
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                      <div className="flex gap-2">
                        {option.payments.map((payment, index) => (
                          <Badge key={index} variant="secondary">
                            €{payment.amount.toFixed(2)} ({payment.percentage}%)
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700">
                <Euro className="h-4 w-4" />
                <span className="font-medium">WhatsApp Integratie Actief</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                Deze service kan nu worden geboekt via WhatsApp met automatische betalingsverwerking.
              </p>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};