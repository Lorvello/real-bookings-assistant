import React, { useState, useEffect } from 'react';
import { Check, Info, CreditCard, Smartphone, Banknote, Globe, Building2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Import payment logos - using exact uploaded logos
import idealLogo from '@/assets/payment-logos/ideal.svg';
import applePayLogo from '@/assets/payment-logos/apple-pay.svg';
import visaLogo from '@/assets/payment-logos/visa.svg';
import mastercardLogo from '@/assets/payment-logos/mastercard.svg';

// Direct URLs to uploaded payment logos (fallback while assets copy is pending)
const googlePayLogo = "/lovable-uploads/385e7546-0b46-4471-a5f1-bfea68119377.png";
const cartesBancairesLogo = "/lovable-uploads/d67ea0a3-cda6-4958-b5ee-63ac62ed2df3.png";
const payByBankLogo = "/lovable-uploads/56681463-1294-4e26-9327-57c08216a9a8.png";
const przelewy24Logo = "/lovable-uploads/aea8da7e-b0b3-4997-81e8-e47542fde82e.png";
const epsLogo = "/lovable-uploads/d8e83d28-6277-43e8-a523-ce0dd385145e.png";
const sofortLogo = "/lovable-uploads/81b0d28e-eae6-4092-b63c-cd5099e26bdd.png";
const revolutLogo = "/lovable-uploads/c4dcd094-64f4-4baf-8fa2-bf8cbfde9c14.png";
const twintLogo = "/lovable-uploads/a361c4b3-8aa1-4871-8f1e-0a2d473cbab3.png";
const blikLogo = "/lovable-uploads/1808307f-106b-484b-b430-8af55e9c4bb5.png";
const bancontactLogo = "/lovable-uploads/8bc2532e-2959-4f9f-a1e1-8c847bee47a7.png";

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
  // Left column - existing methods
  {
    id: 'ideal',
    name: 'iDEAL',
    description: 'Trusted bank-to-bank payments',
    icon: Building2,
    logo: idealLogo,
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
    logo: visaLogo,
    modalContent: {
      title: 'Cards (Visa/Mastercard)',
      description: 'Universal acceptance and familiar experience.',
      bullets: [
        'Great for international customers and repeat buyers',
        'Supports saved cards and subscriptions',
        'Tiered pricing: EEA cards (1.5% + €0.25), UK cards (2.5% + €0.25), International cards (3.25% + €0.25)',
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
    logo: applePayLogo,
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
    logo: bancontactLogo,
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
    id: 'blik',
    name: 'BLIK',
    description: 'Poland\'s mobile payment system',
    icon: Smartphone,
    logo: blikLogo,
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
    priority: 5
  },
  {
    id: 'twint',
    name: 'TWINT',
    description: 'Switzerland\'s mobile wallet',
    icon: Smartphone,
    logo: twintLogo,
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
    priority: 6
  },
  {
    id: 'revolut-pay',
    name: 'Revolut Pay',
    description: 'Fast checkout for Revolut users',
    icon: Globe,
    logo: revolutLogo,
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
    priority: 7
  },
  // Right column - new methods
  {
    id: 'sofort',
    name: 'Sofort',
    description: 'Bank transfer for DACH region',
    icon: Building2,
    logo: sofortLogo,
    country: 'Germany',
    modalContent: {
      title: 'Sofort',
      description: 'Widely used bank transfer method across DACH; high trust and strong completion for local shoppers.',
      bullets: [
        'Widely used bank transfer method across DACH',
        'High trust and strong completion for local shoppers',
        'Perfect for German, Austrian, and Swiss customers',
        'View fees in the Fees section'
      ]
    },
    priority: 8
  },
  {
    id: 'eps',
    name: 'EPS',
    description: 'Austria\'s local bank payment',
    icon: Building2,
    logo: epsLogo,
    country: 'Austria',
    modalContent: {
      title: 'EPS',
      description: 'Austria\'s local bank payment; fast, trusted, and familiar for Austrian customers.',
      bullets: [
        'Austria\'s local bank payment',
        'Fast, trusted, and familiar for Austrian customers',
        'Bank-backed with high completion rates',
        'View fees in the Fees section'
      ]
    },
    priority: 9
  },
  {
    id: 'przelewy24',
    name: 'Przelewy24',
    description: 'Popular Polish bank network',
    icon: Building2,
    logo: przelewy24Logo,
    country: 'Poland',
    modalContent: {
      title: 'Przelewy24 (P24)',
      description: 'Popular Polish bank network; complements BLIK and increases coverage in Poland.',
      bullets: [
        'Popular Polish bank network',
        'Complements BLIK and increases coverage in Poland',
        'Wide bank support and trusted by Polish customers',
        'View fees in the Fees section'
      ]
    },
    priority: 10
  },
  {
    id: 'pay-by-bank',
    name: 'Pay by Bank',
    description: 'UK open-banking flow',
    icon: Building2,
    logo: payByBankLogo,
    country: 'United Kingdom',
    modalContent: {
      title: 'Pay by Bank',
      description: 'UK open-banking flow; fast authentication and strong fraud profile via bank rails.',
      bullets: [
        'UK open-banking flow',
        'Fast authentication and strong fraud profile via bank rails',
        'Secure and trusted by UK customers',
        'View fees in the Fees section'
      ]
    },
    priority: 11
  },
  {
    id: 'cartes-bancaires',
    name: 'Cartes Bancaires',
    description: 'France\'s domestic card scheme',
    icon: CreditCard,
    logo: cartesBancairesLogo,
    country: 'France',
    modalContent: {
      title: 'Cartes Bancaires (CB)',
      description: 'France\'s domestic card scheme; essential coverage for French shoppers.',
      bullets: [
        'France\'s domestic card scheme',
        'Essential coverage for French shoppers',
        'High acceptance and trust in France',
        'View fees in the Fees section'
      ]
    },
    priority: 12
  },
  {
    id: 'google-pay',
    name: 'Google Pay',
    description: 'One-tap checkout on Android/Chrome',
    icon: Smartphone,
    logo: googlePayLogo,
    modalContent: {
      title: 'Google Pay',
      description: 'One-tap checkout on Android/Chrome; same pricing as cards; excellent mobile conversion.',
      bullets: [
        'One-tap checkout on Android/Chrome',
        'Same pricing as cards; excellent mobile conversion',
        'Great for mobile-first audiences and Android users',
        'View fees in the Fees section'
      ]
    },
    priority: 13
  }
];

interface PaymentOptionsProps {
  selectedMethods?: string[];
  onSelectionChange?: (selectedMethods: string[]) => void;
  onSave?: (selectedMethods: string[]) => void;
  onFeesOpen?: () => void;
  className?: string;
  hasUnsavedChanges?: boolean;
}

interface PaymentMethodModalProps {
  method: PaymentMethod;
  isOpen: boolean;
  onClose: () => void;
  onFeesOpen?: () => void;
}

function PaymentMethodModal({ method, isOpen, onClose, onFeesOpen }: PaymentMethodModalProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      // Delay content animation to match ResearchModal
      const timer = setTimeout(() => setShowContent(true), 200);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    } else {
      setShowContent(false);
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-[calc(100vw-32px)] sm:max-w-md bg-background rounded-2xl border shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            {method.logo ? (
              <img 
                src={method.logo} 
                alt={`${method.name} logo`}
                className="h-6 w-auto object-contain"
                loading="lazy"
              />
            ) : (
              <method.icon className="h-6 w-6 text-primary" />
            )}
            {method.modalContent.title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="px-6 py-4 space-y-4">
          <p className="text-muted-foreground text-sm leading-relaxed">
            {method.modalContent.description}
          </p>
          
          <div className="space-y-2">
            {method.modalContent.bullets.slice(0, -1).map((bullet, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-sm text-foreground">{bullet}</span>
              </div>
            ))}
          </div>
          
          <div className="pt-2">
            <button 
              className="text-primary text-sm hover:underline"
              onClick={() => {
                onClose();
                // Scroll to fees section and open it
                setTimeout(() => {
                  const feesSection = document.getElementById('fees-section');
                  if (feesSection) {
                    feesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                  onFeesOpen?.();
                }, 100);
              }}
            >
              View fees in the Fees section
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PaymentOptions({ 
  selectedMethods = ['ideal'], 
  onSelectionChange,
  onSave,
  onFeesOpen,
  className,
  hasUnsavedChanges = false
}: PaymentOptionsProps) {
  const [selected, setSelected] = useState<string[]>(selectedMethods);
  const [openModalId, setOpenModalId] = useState<string | null>(null);

  // Sync internal state with props when selectedMethods changes
  useEffect(() => {
    setSelected(selectedMethods);
  }, [selectedMethods]);

  const handleMethodToggle = (methodId: string) => {
    const newSelected = selected.includes(methodId)
      ? selected.filter(id => id !== methodId)
      : [...selected, methodId];
    
    setSelected(newSelected);
    onSelectionChange?.(newSelected);
  };

  const sortedMethods = paymentMethods.sort((a, b) => a.priority - b.priority);
  const leftColumnMethods = sortedMethods.filter(method => method.priority <= 7);
  const rightColumnMethods = sortedMethods.filter(method => method.priority > 7);

  const renderMethodCard = (method: PaymentMethod) => {
    const isSelected = selected.includes(method.id);
    
    return (
      <div key={method.id}>
        <div
          onClick={() => handleMethodToggle(method.id)}
          className={cn(
            "relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200",
            "bg-background hover:border-primary/50",
            isSelected 
              ? "border-primary bg-primary/5" 
              : "border-border"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Checkbox */}
              <div className={cn(
                "w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center",
                isSelected 
                  ? "bg-primary border-primary" 
                  : "border-border"
              )}>
                {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
              </div>
              
              {/* Method Icon/Logo */}
              <div className={cn(
                "p-1 rounded-lg transition-all duration-200 flex items-center justify-center",
                isSelected 
                  ? "bg-primary/10 text-primary" 
                  : "bg-muted text-muted-foreground"
              )}>
                {method.logo ? (
                  <img 
                    src={method.logo} 
                    alt={`${method.name} logo`}
                    className="h-10 w-auto max-w-[80px] object-contain"
                    loading="lazy"
                  />
                ) : (
                  <method.icon className="h-8 w-8" />
                )}
              </div>
              
              {/* Method Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-foreground">{method.name}</h3>
                  {method.badge && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full border border-primary/20">
                      Recommended
                    </span>
                  )}
                  {method.country && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded-full">
                      {method.country}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{method.description}</p>
              </div>
            </div>
            
            {/* Info Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenModalId(method.id);
              }}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label={`More info about ${method.name}`}
            >
              <Info className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Modal for this method */}
        <PaymentMethodModal
          method={method}
          isOpen={openModalId === method.id}
          onClose={() => setOpenModalId(null)}
          onFeesOpen={onFeesOpen}
        />
      </div>
    );
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Payment Methods List - Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column - Existing Methods */}
        <div className="space-y-3">
          {leftColumnMethods.map(renderMethodCard)}
        </div>
        
        {/* Right Column - New Methods */}
        <div className="space-y-3">
          {rightColumnMethods.map(renderMethodCard)}
        </div>
      </div>

      {/* Summary with Save Button */}
      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="font-medium text-foreground">
              {selected.length} payment method{selected.length !== 1 ? 's' : ''} selected
            </span>
            {selected.length > 0 && (
              <span className="text-muted-foreground ml-2">
                ({selected.map(id => paymentMethods.find(m => m.id === id)?.name).join(', ')})
              </span>
            )}
          </div>
          <button
            onClick={() => onSave?.(selected)}
            disabled={!hasUnsavedChanges || !onSave}
            aria-disabled={!hasUnsavedChanges || !onSave}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              (!hasUnsavedChanges || !onSave) && "opacity-50 cursor-not-allowed hover:bg-primary"
            )}
            title={!hasUnsavedChanges ? "Geen wijzigingen om op te slaan" : undefined}
          >
            Save Changes
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Choose payment methods that are popular in your country and have low fees for optimal results.
        </p>
      </div>
    </div>
  );
}