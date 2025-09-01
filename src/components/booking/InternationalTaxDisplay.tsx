import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, Globe } from 'lucide-react';

interface InternationalTaxDisplayProps {
  service: {
    name: string;
    price: number;
    tax_enabled?: boolean;
    applicable_tax_rate?: number;
    tax_behavior?: string;
    business_country?: string;
  };
  showDetails?: boolean;
}

export const InternationalTaxDisplay: React.FC<InternationalTaxDisplayProps> = ({
  service,
  showDetails = true
}) => {
  const basePrice = service.price || 0;
  const taxRate = service.applicable_tax_rate || 0;
  const isInclusive = service.tax_behavior === 'inclusive';
  
  // Calculate tax amounts
  let taxAmount = 0;
  let totalPrice = basePrice;
  let displayBasePrice = basePrice;

  if (service.tax_enabled && taxRate > 0) {
    if (isInclusive) {
      // Tax is included in the price
      taxAmount = basePrice * (taxRate / 100) / (1 + taxRate / 100);
      displayBasePrice = basePrice - taxAmount;
      totalPrice = basePrice;
    } else {
      // Tax is exclusive
      taxAmount = basePrice * (taxRate / 100);
      totalPrice = basePrice + taxAmount;
      displayBasePrice = basePrice;
    }
  }

  const formatCurrency = (amount: number) => {
    const currency = service.business_country === 'GB' ? 'GBP' : 'EUR';
    const symbol = service.business_country === 'GB' ? '£' : '€';
    return `${symbol}${amount.toFixed(2)}`;
  };

  const getCountryName = (code: string) => {
    const countries: Record<string, string> = {
      'NL': 'Netherlands',
      'DE': 'Germany', 
      'FR': 'France',
      'GB': 'United Kingdom',
      'BE': 'Belgium',
      'ES': 'Spain',
      'IT': 'Italy'
    };
    return countries[code] || code;
  };

  return (
    <Card className="border-muted">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">{service.name}</h3>
          {service.business_country && (
            <Badge variant="outline" className="gap-1">
              <Globe className="h-3 w-3" />
              {getCountryName(service.business_country)}
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          {service.tax_enabled && taxRate > 0 ? (
            <>
              <div className="flex justify-between text-sm">
                <span>Service price:</span>
                <span>{formatCurrency(displayBasePrice)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Tax ({taxRate}% {isInclusive ? 'incl.' : 'excl.'}):</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between font-medium border-t pt-2">
                <span>Total:</span>
                <span>{formatCurrency(totalPrice)}</span>
              </div>
              
              {showDetails && (
                <div className="flex items-start gap-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                  <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>
                    Tax calculated according to {getCountryName(service.business_country || 'NL')} regulations.
                    {isInclusive ? ' Tax is included in the displayed price.' : ' Tax will be added at checkout.'}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="flex justify-between font-medium">
              <span>Price:</span>
              <span>{formatCurrency(basePrice)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};