import React, { useState } from 'react';
import { Check, Info, CreditCard, Smartphone, Banknote, Globe, Building2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  logo?: string;
  badge?: string;
  country?: string;
  modalContent: {
    title: string;
    description: string;
    bullets: string[];
  };
  priority: number;
}

const paymentMethods: PaymentMethod[] = [
  {
    id: 'ideal',
    name: 'iDEAL',
    description: 'Trusted bank-to-bank payments',
    icon: Building2,
    badge: 'Recommended in the Netherlands',
    country: 'Netherlands',
    modalContent: {
      title: 'iDEAL',
      description: 'Trusted bank-to-bank payments; the #1 choice in NL.',
      bullets: [
        'Recommended in the Netherlands; widely adopted (used by 80%+ of Dutch shoppers)',
        'Fast checkout, high trust, excellent completion rates',
        'Typically lowest total cost for NL',
        'View fees in the Fees section'
      ]
    },
    priority: 1
  },
  {
    id: 'cards',
    name: 'Cards',
    description: 'Visa & Mastercard',
    icon: CreditCard,
    modalContent: {
      title: 'Cards (Visa/Mastercard)',
      description: 'Universal acceptance and familiar experience.',
      bullets: [
        'Great for international customers and repeat buyers',
        'Supports saved cards and subscriptions',
        'Fees are higher vs. local bank methods; chargebacks possible',
        'View fees in the Fees section'
      ]
    },
    priority: 2
  },
  {
    id: 'apple-pay',
    name: 'Apple Pay',
    description: 'One-tap checkout on Apple devices',
    icon: Smartphone,
    modalContent: {
      title: 'Apple Pay',
      description: 'One-tap checkout on Apple devices; biometric authentication.',
      bullets: [
        'Frictionless mobile UX and strong conversion on iOS',
        'Uses card rails; same pricing as cards',
        'Ideal for mobile-first audiences',
        'View fees in the Fees section'
      ]
    },
    priority: 3
  },
  {
    id: 'bancontact',
    name: 'Bancontact',
    description: 'Belgium\'s preferred payment method',
    icon: Building2,
    country: 'Belgium',
    modalContent: {
      title: 'Bancontact',
      description: 'Belgium\'s go-to local payment method.',
      bullets: [
        'High trust and strong completion rates in BE',
        'Bank-backed; low friction for Belgian customers',
        'Best for businesses serving Belgian traffic',
        'View fees in the Fees section'
      ]
    },
    priority: 4
  },
  {
    id: 'giropay',
    name: 'giropay',
    description: 'German online banking method',
    icon: Banknote,
    country: 'Germany',
    modalContent: {
      title: 'giropay',
      description: 'German online banking method.',
      bullets: [
        'Recognized brand, bank-level trust in DE',
        'Good alternative to cards for German shoppers',
        'Recommended when targeting Germany',
        'View fees in the Fees section'
      ]
    },
    priority: 5
  },
  {
    id: 'sofort',
    name: 'Sofort',
    description: 'Instant bank transfer flow',
    icon: Banknote,
    country: 'Germany / Austria / Switzerland',
    modalContent: {
      title: 'Sofort',
      description: 'Instant bank transfer flow; familiar in DACH.',
      bullets: [
        'Wide coverage across Germany, Austria, Switzerland',
        'Strong adoption for higher-value purchases',
        'Great add-on for DACH audiences',
        'View fees in the Fees section'
      ]
    },
    priority: 6
  },
  {
    id: 'blik',
    name: 'BLIK',
    description: 'Poland\'s mobile payment system',
    icon: Smartphone,
    country: 'Poland',
    modalContent: {
      title: 'BLIK',
      description: 'Poland\'s dominant mobile payment code system.',
      bullets: [
        'Mass adoption in PL; very strong trust',
        'Friction-light approval via banking app',
        'Recommended for Polish customers',
        'View fees in the Fees section'
      ]
    },
    priority: 7
  },
  {
    id: 'twint',
    name: 'TWINT',
    description: 'Switzerland\'s mobile wallet',
    icon: Smartphone,
    country: 'Switzerland',
    modalContent: {
      title: 'TWINT',
      description: 'Switzerland\'s leading mobile wallet.',
      bullets: [
        'High local adoption; bank-linked and trusted',
        'Perfect for Swiss shoppers and on-the-go checkout',
        'Strong mobile conversion',
        'View fees in the Fees section'
      ]
    },
    priority: 8
  },
  {
    id: 'revolut-pay',
    name: 'Revolut Pay',
    description: 'Fast checkout for Revolut users',
    icon: Globe,
    modalContent: {
      title: 'Revolut Pay',
      description: 'Fast checkout for Revolut users, with strong SCA.',
      bullets: [
        'Global digital wallet reach; streamlined experience',
        'Great for mobile and international audiences',
        'Adds diversity beyond cards/banks',
        'View fees in the Fees section'
      ]
    },
    priority: 9
  }
];

interface PaymentOptionsProps {
  selectedMethods?: string[];
  onSelectionChange?: (selectedMethods: string[]) => void;
  className?: string;
}

interface PaymentMethodModalProps {
  method: PaymentMethod;
  isOpen: boolean;
  onClose: () => void;
}

function PaymentMethodModal({ method, isOpen, onClose }: PaymentMethodModalProps) {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md mx-4">
        <div 
          className="bg-background rounded-2xl shadow-2xl border animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                <method.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">{method.modalContent.title}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              {method.modalContent.description}
            </p>
            
            <ul className="space-y-3">
              {method.modalContent.bullets.map((bullet, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2.5 flex-shrink-0" />
                  <span className="text-sm leading-relaxed">
                    {bullet.includes('View fees') ? (
                      <span className="text-primary hover:text-primary/80 cursor-pointer">
                        {bullet}
                      </span>
                    ) : (
                      bullet
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PaymentOptions({ 
  selectedMethods = ['ideal'], 
  onSelectionChange,
  className 
}: PaymentOptionsProps) {
  const [selected, setSelected] = useState<string[]>(selectedMethods);
  const [openModalId, setOpenModalId] = useState<string | null>(null);

  const handleMethodToggle = (methodId: string) => {
    const newSelected = selected.includes(methodId)
      ? selected.filter(id => id !== methodId)
      : [...selected, methodId];
    
    setSelected(newSelected);
    onSelectionChange?.(newSelected);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Payment Methods Grid */}
      <div className="grid grid-cols-1 gap-4">
        {paymentMethods
          .sort((a, b) => a.priority - b.priority)
          .map((method) => {
            const isSelected = selected.includes(method.id);
            
            return (
              <div key={method.id}>
                <div
                  className={cn(
                    "group relative flex items-center p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer",
                    "hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30",
                    "bg-gradient-to-br from-background to-muted/20",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                      : "border-border/50"
                  )}
                  onClick={() => handleMethodToggle(method.id)}
                >
                  {/* Selection Checkbox */}
                  <div className={cn(
                    "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-200 mr-4",
                    isSelected
                      ? "bg-primary border-primary"
                      : "border-muted-foreground/30 group-hover:border-primary/50"
                  )}>
                    {isSelected && (
                      <Check className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                  
                  {/* Payment Method Icon */}
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 mr-4">
                    <method.icon className="h-6 w-6 text-primary" />
                  </div>
                  
                  {/* Method Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{method.name}</h3>
                      {method.badge && (
                        <span className="text-xs bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-2 py-1 rounded-full font-medium">
                          Recommended
                        </span>
                      )}
                      {method.country && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                          {method.country}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{method.description}</p>
                  </div>
                  
                  {/* Info Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenModalId(method.id);
                    }}
                    className="p-2 ml-2 hover:bg-primary/10 rounded-full transition-colors group/info"
                  >
                    <Info className="h-4 w-4 text-muted-foreground group-hover/info:text-primary transition-colors" />
                  </button>
                  
                  {/* Subtle Glow Effect */}
                  <div className={cn(
                    "absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 pointer-events-none",
                    "bg-gradient-to-r from-primary/5 via-transparent to-primary/5",
                    "group-hover:opacity-100"
                  )} />
                </div>

                {/* Modal for this method */}
                <PaymentMethodModal
                  method={method}
                  isOpen={openModalId === method.id}
                  onClose={() => setOpenModalId(null)}
                />
              </div>
            );
          })}
      </div>

      {/* Selection Summary */}
      {selected.length > 0 && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {selected.length} payment method{selected.length !== 1 ? 's' : ''} enabled
          </p>
        </div>
      )}

      {/* Information */}
      <div className="p-4 bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border border-muted/40">
        <p className="text-sm text-muted-foreground text-center leading-relaxed">
          Customers can choose from your selected payment methods during checkout for the best possible experience.
        </p>
      </div>
    </div>
  );
}