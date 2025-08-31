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
  return;
};