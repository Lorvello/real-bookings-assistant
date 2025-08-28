import React, { useState } from 'react';
import { Check, Info, CreditCard, Smartphone, Banknote, Globe, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PaymentMethod {
  id: string;
  name: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  fees: string;
  recommendation?: string;
  details?: string;
  priority?: number;
}

const paymentMethods: PaymentMethod[] = [
  {
    id: 'ideal',
    name: 'iDEAL',
    description: 'Direct bank payments',
    icon: Building2,
    fees: '€0.29',
    recommendation: 'Recommended in the Netherlands',
    details: 'Trusted by millions in the Netherlands. Low fixed fee, no percentage. +2% if currency conversion applies.',
    priority: 1
  },
  {
    id: 'cards',
    name: 'Cards',
    description: 'Visa, Mastercard',
    icon: CreditCard,
    fees: '1.5% + €0.25',
    details: 'EEA standard cards: 1.5% + €0.25. Premium cards: 1.9% + €0.25. UK cards: 2.5% + €0.25. International: 3.25% + €0.25. +2% if currency conversion applies.',
    priority: 2
  },
  {
    id: 'apple-pay',
    name: 'Apple Pay',
    description: 'One-touch payments',
    icon: Smartphone,
    fees: 'Same as cards',
    details: 'Same fees as card transactions. No additional Apple Pay fee. Secure and convenient for iOS users.',
    priority: 3
  },
  {
    id: 'bancontact',
    name: 'Bancontact',
    description: 'Belgium payments',
    icon: Building2,
    fees: '€0.35',
    details: 'Belgium\'s preferred payment method. Low fixed fee. +2% if currency conversion applies.',
    priority: 4
  },
  {
    id: 'blik',
    name: 'BLIK',
    description: 'Poland mobile payments',
    icon: Smartphone,
    fees: '1.6% + €0.25',
    details: 'Poland\'s mobile payment system. Popular for quick mobile transactions. +2% if currency conversion applies.',
    priority: 5
  },
  {
    id: 'twint',
    name: 'TWINT',
    description: 'Switzerland mobile app',
    icon: Smartphone,
    fees: '1.9% + CHF 0.30',
    details: 'Switzerland\'s leading mobile payment app. Swiss franc pricing as it\'s a Swiss method.',
    priority: 6
  },
  {
    id: 'revolut-pay',
    name: 'Revolut Pay',
    description: 'Global digital payments',
    icon: Globe,
    fees: '1.5% + €0.25',
    details: 'Fast & secure global payments. Competitive rates for international transactions. +2% if currency conversion applies.',
    priority: 7
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
    <TooltipProvider>
      <div className={cn("space-y-4", className)}>
        {/* Payment Methods List */}
        <div className="space-y-2">
          {paymentMethods
            .sort((a, b) => (a.priority || 99) - (b.priority || 99))
            .map((method) => {
              const isSelected = selected.includes(method.id);
              
              return (
                <div
                  key={method.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-all duration-200",
                    "hover:bg-muted/50 cursor-pointer",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                  onClick={() => handleMethodToggle(method.id)}
                >
                  <div className="flex items-center space-x-3">
                    {/* Checkbox */}
                    <div className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200",
                      isSelected
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30"
                    )}>
                      {isSelected && (
                        <Check className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    
                    {/* Icon */}
                    <div className="flex items-center justify-center w-8 h-8 rounded bg-muted/50">
                      <method.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    
                    {/* Method Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{method.name}</span>
                        {method.recommendation && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {method.description}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Fee */}
                    <span className="text-sm font-medium">{method.fees}</span>
                    
                    {/* Info Icon */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 hover:bg-muted rounded"
                        >
                          <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="space-y-1">
                          {method.recommendation && (
                            <p className="font-medium text-primary text-xs">{method.recommendation}</p>
                          )}
                          <p className="text-xs">{method.details}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Selection Summary */}
        {selected.length > 0 && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {selected.length} payment method{selected.length !== 1 ? 's' : ''} selected
            </p>
          </div>
        )}

        {/* Information */}
        <div className="p-3 bg-muted/30 rounded-lg border border-muted/40">
          <p className="text-sm text-muted-foreground text-center">
            When you select payment methods, customers will have the option to pay with any of the selected methods during booking.
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}