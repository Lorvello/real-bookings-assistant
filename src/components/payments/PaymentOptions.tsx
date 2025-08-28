import React, { useState } from 'react';
import { Check, Star, CreditCard, Smartphone, Banknote, Zap, Globe, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentMethod {
  id: string;
  name: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  countryCode?: string;
  priority?: number;
}

const paymentMethods: PaymentMethod[] = [
  {
    id: 'ideal',
    name: 'iDEAL',
    description: 'Trusted by millions in the Netherlands',
    icon: Building2,
    badge: 'Recommended in the Netherlands',
    countryCode: 'NL',
    priority: 1
  },
  {
    id: 'cards',
    name: 'Credit Cards',
    description: 'Visa & Mastercard accepted',
    icon: CreditCard,
    priority: 2
  },
  {
    id: 'apple-pay',
    name: 'Apple Pay',
    description: 'One-touch secure payments',
    icon: Smartphone,
    priority: 3
  },
  {
    id: 'bancontact',
    name: 'Bancontact',
    description: 'Belgium\'s preferred payment method',
    icon: Building2,
    countryCode: 'BE',
    priority: 4
  },
  {
    id: 'giropay',
    name: 'giropay',
    description: 'Direct bank transfer from Germany',
    icon: Banknote,
    countryCode: 'DE',
    priority: 5
  },
  {
    id: 'sofort',
    name: 'Sofort',
    description: 'Germany, Austria & Switzerland',
    icon: Zap,
    countryCode: 'DE',
    priority: 6
  },
  {
    id: 'blik',
    name: 'BLIK',
    description: 'Poland\'s mobile payment system',
    icon: Smartphone,
    countryCode: 'PL',
    priority: 7
  },
  {
    id: 'twint',
    name: 'TWINT',
    description: 'Switzerland\'s mobile payment app',
    icon: Smartphone,
    countryCode: 'CH',
    priority: 8
  },
  {
    id: 'revolut-pay',
    name: 'Revolut Pay',
    description: 'Fast & secure global payments',
    icon: Globe,
    priority: 9
  }
];

interface PaymentOptionsProps {
  selectedMethods?: string[];
  onSelectionChange?: (selectedMethods: string[]) => void;
  className?: string;
}

export function PaymentOptions({ 
  selectedMethods = ['ideal'], 
  onSelectionChange,
  className 
}: PaymentOptionsProps) {
  const [selected, setSelected] = useState<string[]>(selectedMethods);

  const handleMethodToggle = (methodId: string) => {
    const newSelected = selected.includes(methodId)
      ? selected.filter(id => id !== methodId)
      : [...selected, methodId];
    
    setSelected(newSelected);
    onSelectionChange?.(newSelected);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with recommendation */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
          <Star className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            We recommend iDEAL for the Netherlands: trusted, fast, and lowest fees.
          </span>
        </div>
      </div>

      {/* Payment Methods Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {paymentMethods
          .sort((a, b) => (a.priority || 99) - (b.priority || 99))
          .map((method) => {
            const isSelected = selected.includes(method.id);
            const isRecommended = method.id === 'ideal';
            
            return (
              <div
                key={method.id}
                onClick={() => handleMethodToggle(method.id)}
                className={cn(
                  "relative group cursor-pointer",
                  "p-4 rounded-lg border transition-all duration-200",
                  "hover:shadow-md",
                  "bg-background",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/50",
                  isRecommended && "ring-1 ring-primary/30"
                )}
              >
                {/* Selection Indicator */}
                <div className={cn(
                  "absolute top-3 right-3 w-6 h-6 rounded-full border-2 transition-all duration-200",
                  "flex items-center justify-center",
                  isSelected
                    ? "bg-primary border-primary"
                    : "border-muted-foreground/30 group-hover:border-primary/50"
                )}>
                  {isSelected && (
                    <Check className="h-3 w-3 text-primary-foreground" />
                  )}
                </div>

                {/* Recommended Badge */}
                {method.badge && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <div className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full shadow-lg">
                      {method.badge}
                    </div>
                  </div>
                )}

                {/* Payment Method Content */}
                <div className="space-y-3">
                  {/* Icon */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted/50">
                    <method.icon className="h-5 w-5 text-muted-foreground" />
                  </div>

                  {/* Name */}
                  <div className="space-y-1">
                    <h3 className={cn(
                      "font-semibold text-base leading-tight transition-colors",
                      isSelected ? "text-primary" : "text-foreground group-hover:text-primary"
                    )}>
                      {method.name}
                    </h3>
                    
                    {/* Description */}
                    {method.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {method.description}
                      </p>
                    )}
                  </div>

                  {/* Country indicator */}
                  {method.countryCode && (
                    <div className="text-xs text-muted-foreground/70 font-medium">
                      Popular in {method.countryCode}
                    </div>
                  )}
                </div>

                {/* Hover gradient overlay */}
                <div className={cn(
                  "absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300",
                  "bg-gradient-to-br from-primary/5 to-transparent",
                  "group-hover:opacity-100"
                )} />
              </div>
            );
          })}
      </div>

      {/* Selection Summary */}
      {selected.length > 0 && (
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            {selected.length} payment method{selected.length !== 1 ? 's' : ''} selected
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {selected.map(methodId => {
              const method = paymentMethods.find(m => m.id === methodId);
              return method ? (
                <span
                  key={methodId}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full border border-primary/20"
                >
                  <method.icon className="h-3 w-3" />
                  <span>{method.name}</span>
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Payment Methods Information */}
      <div className="p-4 bg-muted/30 rounded-lg border border-muted/40">
        <div className="space-y-2 text-center">
          <p className="text-sm text-muted-foreground">
            When you select payment methods, customers will have the option to pay with any of the selected methods during booking.
          </p>
          <p className="text-xs text-muted-foreground/80">
            Note: Different payment methods have varying transaction fees. Final fees will be calculated based on the customer's chosen payment method.
          </p>
        </div>
      </div>
    </div>
  );
}