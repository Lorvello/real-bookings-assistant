import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
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

// Brand `name`/`logo`/`icon` and the logic `id`/`priority` stay verbatim; the display
// copy (description/badge/country/modalContent) is translated via t() per method.
const getPaymentMethods = (t: TFunction): PaymentMethod[] => [
  {
    id: 'ideal',
    name: 'iDEAL',
    description: t('settings.payments.methods.ideal.description', 'Trusted bank-to-bank payments'),
    icon: Building2,
    logo: idealLogo,
    badge: t('settings.payments.methods.ideal.badge', 'Recommended in the Netherlands'),
    country: t('settings.payments.methods.country.netherlands', 'Netherlands'),
    modalContent: {
      title: 'iDEAL',
      description: t('settings.payments.methods.ideal.modal.description', 'Trusted bank-to-bank payments; the #1 choice in NL.'),
      bullets: [
        t('settings.payments.methods.ideal.modal.bullet1', 'Recommended in the Netherlands; widely adopted (used by 80%+ of Dutch shoppers)'),
        t('settings.payments.methods.ideal.modal.bullet2', 'Fast checkout, high trust, excellent completion rates'),
        t('settings.payments.methods.ideal.modal.bullet3', 'Typically lowest total cost for NL'),
        t('settings.payments.methods.viewFeesBullet', 'View fees in the Fees section'),
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
      description: t('settings.payments.methods.cards.modal.description', 'Universal acceptance and familiar experience.'),
      bullets: [
        t('settings.payments.methods.cards.modal.bullet1', 'Great for international customers and repeat buyers'),
        t('settings.payments.methods.cards.modal.bullet2', 'Supports saved cards and subscriptions'),
        t('settings.payments.methods.cards.modal.bullet3', 'Tiered pricing: EEA cards (1.5% + €0.25), UK cards (2.5% + €0.25), International cards (3.25% + €0.25)'),
        t('settings.payments.methods.viewFeesBullet', 'View fees in the Fees section'),
      ],
    },
    priority: 2,
  },
  {
    id: 'apple-pay',
    name: 'Apple Pay',
    description: t('settings.payments.methods.applePay.description', 'One-tap checkout on Apple devices'),
    icon: Smartphone,
    logo: applePayLogo,
    modalContent: {
      title: 'Apple Pay',
      description: t('settings.payments.methods.applePay.modal.description', 'One-tap checkout on Apple devices; biometric authentication.'),
      bullets: [
        t('settings.payments.methods.applePay.modal.bullet1', 'Frictionless mobile UX and strong conversion on iOS'),
        t('settings.payments.methods.applePay.modal.bullet2', 'Uses card rails; same pricing as cards'),
        t('settings.payments.methods.applePay.modal.bullet3', 'Ideal for mobile-first audiences'),
        t('settings.payments.methods.viewFeesBullet', 'View fees in the Fees section'),
      ],
    },
    priority: 3,
  },
  {
    id: 'bancontact',
    name: 'Bancontact',
    description: t('settings.payments.methods.bancontact.description', "Belgium's preferred payment method"),
    icon: Building2,
    logo: bancontactLogo,
    country: t('settings.payments.methods.country.belgium', 'Belgium'),
    modalContent: {
      title: 'Bancontact',
      description: t('settings.payments.methods.bancontact.modal.description', "Belgium's go-to local payment method."),
      bullets: [
        t('settings.payments.methods.bancontact.modal.bullet1', 'High trust and strong completion rates in BE'),
        t('settings.payments.methods.bancontact.modal.bullet2', 'Bank-backed; low friction for Belgian customers'),
        t('settings.payments.methods.bancontact.modal.bullet3', 'Best for businesses serving Belgian traffic'),
        t('settings.payments.methods.viewFeesBullet', 'View fees in the Fees section'),
      ],
    },
    priority: 4,
  },
  {
    id: 'blik',
    name: 'BLIK',
    description: t('settings.payments.methods.blik.description', "Poland's mobile payment system"),
    icon: Smartphone,
    logo: blikLogo,
    country: t('settings.payments.methods.country.poland', 'Poland'),
    modalContent: {
      title: 'BLIK',
      description: t('settings.payments.methods.blik.modal.description', "Poland's dominant mobile payment code system."),
      bullets: [
        t('settings.payments.methods.blik.modal.bullet1', 'Mass adoption in PL; very strong trust'),
        t('settings.payments.methods.blik.modal.bullet2', 'Friction-light approval via banking app'),
        t('settings.payments.methods.blik.modal.bullet3', 'Recommended for Polish customers'),
        t('settings.payments.methods.viewFeesBullet', 'View fees in the Fees section'),
      ],
    },
    priority: 5,
  },
  {
    id: 'twint',
    name: 'TWINT',
    description: t('settings.payments.methods.twint.description', "Switzerland's mobile wallet"),
    icon: Smartphone,
    logo: twintLogo,
    country: t('settings.payments.methods.country.switzerland', 'Switzerland'),
    modalContent: {
      title: 'TWINT',
      description: t('settings.payments.methods.twint.modal.description', "Switzerland's leading mobile wallet."),
      bullets: [
        t('settings.payments.methods.twint.modal.bullet1', 'High local adoption; bank-linked and trusted'),
        t('settings.payments.methods.twint.modal.bullet2', 'Perfect for Swiss shoppers and on-the-go checkout'),
        t('settings.payments.methods.twint.modal.bullet3', 'Strong mobile conversion'),
        t('settings.payments.methods.viewFeesBullet', 'View fees in the Fees section'),
      ],
    },
    priority: 6,
  },
  {
    id: 'revolut-pay',
    name: 'Revolut Pay',
    description: t('settings.payments.methods.revolutPay.description', 'Fast checkout for Revolut users'),
    icon: Globe,
    logo: revolutLogo,
    modalContent: {
      title: 'Revolut Pay',
      description: t('settings.payments.methods.revolutPay.modal.description', 'Fast checkout for Revolut users, with strong SCA.'),
      bullets: [
        t('settings.payments.methods.revolutPay.modal.bullet1', 'Global digital wallet reach; streamlined experience'),
        t('settings.payments.methods.revolutPay.modal.bullet2', 'Great for mobile and international audiences'),
        t('settings.payments.methods.revolutPay.modal.bullet3', 'Adds diversity beyond cards/banks'),
        t('settings.payments.methods.viewFeesBullet', 'View fees in the Fees section'),
      ],
    },
    priority: 7,
  },
  {
    id: 'sofort',
    name: 'Sofort',
    description: t('settings.payments.methods.sofort.description', 'Bank transfer for DACH region'),
    icon: Building2,
    logo: sofortLogo,
    country: t('settings.payments.methods.country.germany', 'Germany'),
    modalContent: {
      title: 'Sofort',
      description: t('settings.payments.methods.sofort.modal.description', 'Widely used bank transfer method across DACH; high trust and strong completion for local shoppers.'),
      bullets: [
        t('settings.payments.methods.sofort.modal.bullet1', 'Widely used bank transfer method across DACH'),
        t('settings.payments.methods.sofort.modal.bullet2', 'High trust and strong completion for local shoppers'),
        t('settings.payments.methods.sofort.modal.bullet3', 'Perfect for German, Austrian, and Swiss customers'),
        t('settings.payments.methods.viewFeesBullet', 'View fees in the Fees section'),
      ],
    },
    priority: 8,
  },
  {
    id: 'eps',
    name: 'EPS',
    description: t('settings.payments.methods.eps.description', "Austria's local bank payment"),
    icon: Building2,
    logo: epsLogo,
    country: t('settings.payments.methods.country.austria', 'Austria'),
    modalContent: {
      title: 'EPS',
      description: t('settings.payments.methods.eps.modal.description', "Austria's local bank payment; fast, trusted, and familiar for Austrian customers."),
      bullets: [
        t('settings.payments.methods.eps.modal.bullet1', "Austria's local bank payment"),
        t('settings.payments.methods.eps.modal.bullet2', 'Fast, trusted, and familiar for Austrian customers'),
        t('settings.payments.methods.eps.modal.bullet3', 'Bank-backed with high completion rates'),
        t('settings.payments.methods.viewFeesBullet', 'View fees in the Fees section'),
      ],
    },
    priority: 9,
  },
  {
    id: 'przelewy24',
    name: 'Przelewy24',
    description: t('settings.payments.methods.przelewy24.description', 'Popular Polish bank network'),
    icon: Building2,
    logo: przelewy24Logo,
    country: t('settings.payments.methods.country.poland', 'Poland'),
    modalContent: {
      title: 'Przelewy24 (P24)',
      description: t('settings.payments.methods.przelewy24.modal.description', 'Popular Polish bank network; complements BLIK and increases coverage in Poland.'),
      bullets: [
        t('settings.payments.methods.przelewy24.modal.bullet1', 'Popular Polish bank network'),
        t('settings.payments.methods.przelewy24.modal.bullet2', 'Complements BLIK and increases coverage in Poland'),
        t('settings.payments.methods.przelewy24.modal.bullet3', 'Wide bank support and trusted by Polish customers'),
        t('settings.payments.methods.viewFeesBullet', 'View fees in the Fees section'),
      ],
    },
    priority: 10,
  },
  {
    id: 'pay-by-bank',
    name: 'Pay by Bank',
    description: t('settings.payments.methods.payByBank.description', 'UK open-banking flow'),
    icon: Building2,
    logo: payByBankLogo,
    country: t('settings.payments.methods.country.unitedKingdom', 'United Kingdom'),
    modalContent: {
      title: 'Pay by Bank',
      description: t('settings.payments.methods.payByBank.modal.description', 'UK open-banking flow; fast authentication and strong fraud profile via bank rails.'),
      bullets: [
        t('settings.payments.methods.payByBank.modal.bullet1', 'UK open-banking flow'),
        t('settings.payments.methods.payByBank.modal.bullet2', 'Fast authentication and strong fraud profile via bank rails'),
        t('settings.payments.methods.payByBank.modal.bullet3', 'Secure and trusted by UK customers'),
        t('settings.payments.methods.viewFeesBullet', 'View fees in the Fees section'),
      ],
    },
    priority: 11,
  },
  {
    id: 'cartes-bancaires',
    name: 'Cartes Bancaires',
    description: t('settings.payments.methods.cartesBancaires.description', "France's domestic card scheme"),
    icon: CreditCard,
    logo: cartesBancairesLogo,
    country: t('settings.payments.methods.country.france', 'France'),
    modalContent: {
      title: 'Cartes Bancaires (CB)',
      description: t('settings.payments.methods.cartesBancaires.modal.description', "France's domestic card scheme; essential coverage for French shoppers."),
      bullets: [
        t('settings.payments.methods.cartesBancaires.modal.bullet1', "France's domestic card scheme"),
        t('settings.payments.methods.cartesBancaires.modal.bullet2', 'Essential coverage for French shoppers'),
        t('settings.payments.methods.cartesBancaires.modal.bullet3', 'High acceptance and trust in France'),
        t('settings.payments.methods.viewFeesBullet', 'View fees in the Fees section'),
      ],
    },
    priority: 12,
  },
  {
    id: 'google-pay',
    name: 'Google Pay',
    description: t('settings.payments.methods.googlePay.description', 'One-tap checkout on Android/Chrome'),
    icon: Smartphone,
    logo: googlePayLogo,
    modalContent: {
      title: 'Google Pay',
      description: t('settings.payments.methods.googlePay.modal.description', 'One-tap checkout on Android/Chrome; same pricing as cards; excellent mobile conversion.'),
      bullets: [
        t('settings.payments.methods.googlePay.modal.bullet1', 'One-tap checkout on Android/Chrome'),
        t('settings.payments.methods.googlePay.modal.bullet2', 'Same pricing as cards; excellent mobile conversion'),
        t('settings.payments.methods.googlePay.modal.bullet3', 'Great for mobile-first audiences and Android users'),
        t('settings.payments.methods.viewFeesBullet', 'View fees in the Fees section'),
      ],
    },
    priority: 13,
  },
];

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
  const { t } = useTranslation('settings');
  const paymentMethods = React.useMemo(() => getPaymentMethods(t), [t]);
  // Stable display order (never mutate the source array).
  const sortedMethods = React.useMemo(() => [...paymentMethods].sort((a, b) => a.priority - b.priority), [paymentMethods]);
  const leftColumn = sortedMethods.filter((m) => m.priority <= 7);
  const rightColumn = sortedMethods.filter((m) => m.priority > 7);
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
        aria-label={`${method.name}, ${method.description}`}
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
                    {t('settings.payments.methods.recommended', 'Recommended')}
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
            aria-label={t('settings.payments.methods.moreInfoAria', 'More info about {{name}}', { name: method.name })}
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
        <div className="space-y-3">{leftColumn.map(renderMethodCard)}</div>
        <div className="space-y-3">{rightColumn.map(renderMethodCard)}</div>
      </div>

      {/* Summary + save */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <div className="min-w-0 text-sm">
          <span className="font-medium text-foreground">
            {selected.length === 1
              ? t('settings.payments.methods.selectedCountOne', '{{n}} payment method selected', { n: selected.length })
              : t('settings.payments.methods.selectedCountOther', '{{n}} payment methods selected', { n: selected.length })}
          </span>
          {selected.length > 0 && (
            <span className="ml-2 text-muted-foreground">
              ({selected.map((id) => paymentMethods.find((m) => m.id === id)?.name).filter(Boolean).join(', ')})
            </span>
          )}
        </div>
        <Button size="sm" onClick={() => onSave?.(selected)} disabled={!hasUnsavedChanges || !onSave}>
          {t('settings.payments.methods.saveChanges', 'Save changes')}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {t('settings.payments.methods.tip', 'Choose payment methods that are popular in your country and have low fees for the best results.')}
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
                  {t('settings.payments.methods.viewFeesBullet', 'View fees in the Fees section')}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
