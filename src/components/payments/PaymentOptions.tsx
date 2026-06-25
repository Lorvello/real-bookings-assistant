import React, { useState, useEffect } from 'react';
import { Check, Info, CreditCard, Smartphone, Globe, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Import payment logos - using exact uploaded logos
import idealLogo from '@/assets/payment-logos/ideal.svg';
import applePayLogo from '@/assets/payment-logos/apple-pay.svg';
import visaLogo from '@/assets/payment-logos/visa.svg';
import mastercardLogo from '@/assets/payment-logos/mastercard.svg';

// Direct URLs to uploaded payment logos (fallback while assets copy is pending)
const googlePayLogo = '/lovable-uploads/385e7546-0b46-4471-a5f1-bfea68119377.png';
const cartesBancairesLogo = '/lovable-uploads/d67ea0a3-cda6-4958-b5ee-63ac62ed2df3.png';
const payByBankLogo = '/lovable-uploads/56681463-1294-4e26-9327-57c08216a9a8.png';
const przelewy24Logo = '/lovable-uploads/aea8da7e-b0b3-4997-81e8-e47542fde82e.png';
const epsLogo = '/lovable-uploads/d8e83d28-6277-43e8-a523-ce0dd385145e.png';
const sofortLogo = '/lovable-uploads/81b0d28e-eae6-4092-b63c-cd5099e26bdd.png';
const revolutLogo = '/lovable-uploads/c4dcd094-64f4-4baf-8fa2-bf8cbfde9c14.png';
const twintLogo = '/lovable-uploads/a361c4b3-8aa1-4871-8f1e-0a2d473cbab3.png';
const blikLogo = '/lovable-uploads/1808307f-106b-484b-b430-8af55e9c4bb5.png';
const bancontactLogo = '/lovable-uploads/8bc2532e-2959-4f9f-a1e1-8c847bee47a7.png';

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
        'View fees in the Fees section',
      ],
    },
    priority: 1,
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
        'View fees in the Fees section',
      ],
    },
    priority: 2,
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
        'View fees in the Fees section',
      ],
    },
    priority: 3,
  },
  {
    id: 'bancontact',
    name: 'Bancontact',
    description: "Belgium's preferred payment method",
    icon: Building2,
    logo: bancontactLogo,
    country: 'Belgium',
    modalContent: {
      title: 'Bancontact',
      description: "Belgium's go-to local payment method.",
      bullets: [
        'High trust and strong completion rates in BE',
        'Bank-backed; low friction for Belgian customers',
        'Best for businesses serving Belgian traffic',
        'View fees in the Fees section',
      ],
    },
    priority: 4,
  },
  {
    id: 'blik',
    name: 'BLIK',
    description: "Poland's mobile payment system",
    icon: Smartphone,
    logo: blikLogo,
    country: 'Poland',
    modalContent: {
      title: 'BLIK',
      description: "Poland's dominant mobile payment code system.",
      bullets: [
        'Mass adoption in PL; very strong trust',
        'Friction-light approval via banking app',
        'Recommended for Polish customers',
        'View fees in the Fees section',
      ],
    },
    priority: 5,
  },
  {
    id: 'twint',
    name: 'TWINT',
    description: "Switzerland's mobile wallet",
    icon: Smartphone,
    logo: twintLogo,
    country: 'Switzerland',
    modalContent: {
      title: 'TWINT',
      description: "Switzerland's leading mobile wallet.",
      bullets: [
        'High local adoption; bank-linked and trusted',
        'Perfect for Swiss shoppers and on-the-go checkout',
        'Strong mobile conversion',
        'View fees in the Fees section',
      ],
    },
    priority: 6,
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
        'View fees in the Fees section',
      ],
    },
    priority: 7,
  },
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
        'View fees in the Fees section',
      ],
    },
    priority: 8,
  },
  {
    id: 'eps',
    name: 'EPS',
    description: "Austria's local bank payment",
    icon: Building2,
    logo: epsLogo,
    country: 'Austria',
    modalContent: {
      title: 'EPS',
      description: "Austria's local bank payment; fast, trusted, and familiar for Austrian customers.",
      bullets: [
        "Austria's local bank payment",
        'Fast, trusted, and familiar for Austrian customers',
        'Bank-backed with high completion rates',
        'View fees in the Fees section',
      ],
    },
    priority: 9,
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
        'View fees in the Fees section',
      ],
    },
    priority: 10,
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
        'View fees in the Fees section',
      ],
    },
    priority: 11,
  },
  {
    id: 'cartes-bancaires',
    name: 'Cartes Bancaires',
    description: "France's domestic card scheme",
    icon: CreditCard,
    logo: cartesBancairesLogo,
    country: 'France',
    modalContent: {
      title: 'Cartes Bancaires (CB)',
      description: "France's domestic card scheme; essential coverage for French shoppers.",
      bullets: [
        "France's domestic card scheme",
        'Essential coverage for French shoppers',
        'High acceptance and trust in France',
        'View fees in the Fees section',
      ],
    },
    priority: 12,
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
        'View fees in the Fees section',
      ],
    },
    priority: 13,
  },
];

// Stable display order, computed once (never mutate the module-level array).
const SORTED_METHODS = [...paymentMethods].sort((a, b) => a.priority - b.priority);
const LEFT_COLUMN = SORTED_METHODS.filter((m) => m.priority <= 7);
const RIGHT_COLUMN = SORTED_METHODS.filter((m) => m.priority > 7);

interface PaymentOptionsProps {
  selectedMethods?: string[];
  onSelectionChange?: (selectedMethods: string[]) => void;
  onSave?: (selectedMethods: string[]) => void;
  onFeesOpen?: () => void;
  className?: string;
  hasUnsavedChanges?: boolean;
}

/**
 * Payment-method picker for the Pay & Book settings tab. Rebuilt on the shared
 * design language (BLOK D R18): token-correct selectable cards with real checkbox
 * semantics + keyboard support, the shared Dialog for the per-method explainer
 * (was a hand-rolled fixed overlay), and the premium <Button> for save.
 */
export function PaymentOptions({
  selectedMethods = ['ideal'],
  onSelectionChange,
  onSave,
  onFeesOpen,
  className,
  hasUnsavedChanges = false,
}: PaymentOptionsProps) {
  const [selected, setSelected] = useState<string[]>(selectedMethods);
  const [openModalId, setOpenModalId] = useState<string | null>(null);

  // Sync internal state with props when selectedMethods changes.
  useEffect(() => {
    setSelected(selectedMethods);
  }, [selectedMethods]);

  const handleMethodToggle = (methodId: string) => {
    const newSelected = selected.includes(methodId)
      ? selected.filter((id) => id !== methodId)
      : [...selected, methodId];
    setSelected(newSelected);
    onSelectionChange?.(newSelected);
  };

  const activeMethod = paymentMethods.find((m) => m.id === openModalId) || null;

  const renderMethodCard = (method: PaymentMethod) => {
    const isSelected = selected.includes(method.id);
    return (
      <div
        key={method.id}
        role="checkbox"
        aria-checked={isSelected}
        aria-label={`${method.name} — ${method.description}`}
        tabIndex={0}
        onClick={() => handleMethodToggle(method.id)}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            handleMethodToggle(method.id);
          }
        }}
        className={cn(
          'cursor-pointer rounded-xl border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          isSelected
            ? 'border-primary/60 bg-primary/[0.06] ring-1 ring-primary/30'
            : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]',
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {/* Checkbox glyph */}
            <span
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-white/20',
              )}
              aria-hidden="true"
            >
              {isSelected && <Check className="h-3 w-3" />}
            </span>

            {/* Logo / icon tile */}
            <span
              className={cn(
                'flex h-9 w-12 shrink-0 items-center justify-center rounded-lg',
                isSelected ? 'bg-primary/10' : 'bg-white/[0.04]',
              )}
            >
              {method.logo ? (
                <img
                  src={method.logo}
                  alt=""
                  className="h-7 w-auto max-w-[40px] object-contain"
                  loading="lazy"
                />
              ) : (
                <method.icon className={cn('h-5 w-5', isSelected ? 'text-accent-foreground' : 'text-muted-foreground')} />
              )}
            </span>

            {/* Info */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-medium text-foreground">{method.name}</h4>
                {method.badge && (
                  <span className="rounded-full border border-primary/20 bg-primary/[0.10] px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
                    Recommended
                  </span>
                )}
                {method.country && (
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium text-subtle-foreground">
                    {method.country}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{method.description}</p>
            </div>
          </div>

          {/* Info button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpenModalId(method.id);
            }}
            // Mobile 44px tap target via the negative-margin idiom (absorbs into the card's
            // p-4 padding so layout/row-height is unchanged); resets to 32px on desktop.
            className="-m-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-subtle-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:-m-1 md:h-8 md:w-8"
            aria-label={`More info about ${method.name}`}
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        <div className="space-y-3">{LEFT_COLUMN.map(renderMethodCard)}</div>
        <div className="space-y-3">{RIGHT_COLUMN.map(renderMethodCard)}</div>
      </div>

      {/* Summary + save */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <div className="min-w-0 text-sm">
          <span className="font-medium text-foreground">
            {selected.length} payment method{selected.length !== 1 ? 's' : ''} selected
          </span>
          {selected.length > 0 && (
            <span className="ml-2 text-muted-foreground">
              ({selected.map((id) => paymentMethods.find((m) => m.id === id)?.name).filter(Boolean).join(', ')})
            </span>
          )}
        </div>
        <Button size="sm" onClick={() => onSave?.(selected)} disabled={!hasUnsavedChanges || !onSave}>
          Save changes
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Choose payment methods that are popular in your country and have low fees for the best results.
      </p>

      {/* Per-method explainer — shared Dialog primitive (focus trap, Esc, labelled title). */}
      <Dialog open={!!openModalId} onOpenChange={(open) => !open && setOpenModalId(null)}>
        <DialogContent className="sm:max-w-md">
          {activeMethod && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {activeMethod.logo ? (
                    <img src={activeMethod.logo} alt="" className="h-6 w-auto object-contain" />
                  ) : (
                    <activeMethod.icon className="h-6 w-6 text-primary" />
                  )}
                  {activeMethod.modalContent.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">{activeMethod.modalContent.description}</p>
                <div className="space-y-2">
                  {activeMethod.modalContent.bullets.slice(0, -1).map((bullet, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                      <span className="text-sm text-foreground">{bullet}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="text-sm text-accent-foreground transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  onClick={() => {
                    setOpenModalId(null);
                    setTimeout(() => {
                      document.getElementById('fees-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      onFeesOpen?.();
                    }, 100);
                  }}
                >
                  View fees in the Fees section
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
