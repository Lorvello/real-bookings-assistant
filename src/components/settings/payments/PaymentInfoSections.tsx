import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  Link as LinkIcon,
  CreditCard,
  CheckCircle,
  Wallet,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FundFlowCard } from '../FundFlowCard';

/** A shared accordion row used by the three help sections inside one flush SettingsSection. */
function InfoRow({
  open,
  onOpenChange,
  id,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <div id={id} className="scroll-mt-8">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:px-6"
          >
            <div>
              <h4 className="text-sm font-semibold text-foreground">{title}</h4>
              <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
            </div>
            <ChevronDown
              className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-5 pb-5 md:px-6 md:pb-6">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

const FLOW_NODES = [
  { labelKey: 'settings.payments.fundFlow.nodes.customer.label', labelDefault: 'Customer', captionKey: 'settings.payments.fundFlow.nodes.customer.caption', captionDefault: 'Payment initiated in local currency' },
  { labelKey: 'settings.payments.fundFlow.nodes.connected.label', labelDefault: 'Connected account', captionKey: 'settings.payments.fundFlow.nodes.connected.caption', captionDefault: 'Gross funds received in account currency' },
  { labelKey: 'settings.payments.fundFlow.nodes.bank.label', labelDefault: 'Bank account', captionKey: 'settings.payments.fundFlow.nodes.bank.caption', captionDefault: 'Funds transferred (standard or instant payout)' },
];

const FLOW_BULLETS: { key: string; default: string }[] = [
  { key: 'settings.payments.fundFlow.bullets.startCurrency', default: "Payments always start in the customer's currency." },
  { key: 'settings.payments.fundFlow.bullets.conversionFee', default: 'If different from your account currency, Stripe applies a 2% conversion fee.' },
  { key: 'settings.payments.fundFlow.bullets.feesDeducted', default: 'Payment-method fee, Stripe fee and platform fee are all deducted automatically before payout.' },
  { key: 'settings.payments.fundFlow.bullets.finalPayout', default: 'Final payout = net balance transferred to your bank (standard or instant).' },
];

export function FundFlowSection({
  open,
  onOpenChange,
  onLearnMoreFees,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLearnMoreFees: () => void;
}) {
  const { t } = useTranslation('settings');
  return (
    <InfoRow
      open={open}
      onOpenChange={onOpenChange}
      title={t('settings.payments.fundFlow.title', 'Fund flow (how money moves)')}
      subtitle={t('settings.payments.fundFlow.subtitle', 'Understand the payment journey for your bookings')}
    >
      <div className="space-y-4">
        <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
          <FlowNode {...FLOW_NODES[0]} />
          <FlowArrow>
            <FundFlowCard
              title={t('settings.payments.fundFlow.processing.title', 'Payment processing')}
              items={[
                { label: t('settings.payments.fundFlow.processing.conversion.label', 'Currency conversion'), description: t('settings.payments.fundFlow.processing.conversion.description', '+2% fee if payment currency differs from your account currency') },
                { label: t('settings.payments.fundFlow.processing.methodFee.label', 'Payment method fee'), description: t('settings.payments.fundFlow.processing.methodFee.description', 'Based on selected method (iDEAL: €0.29, Cards: 1.5–2.5% + €0.25)') },
                { label: t('settings.payments.fundFlow.processing.platformFee.label', 'Platform fee'), description: t('settings.payments.fundFlow.processing.platformFee.description', '1.9% + €0.25/€0.35 deducted by Booking Assistant') },
              ]}
              className="max-w-[220px]"
            />
          </FlowArrow>
          <FlowNode {...FLOW_NODES[1]} />
          <FlowArrow>
            <FundFlowCard
              title={t('settings.payments.fundFlow.stripeProcessing.title', 'Stripe processing')}
              items={[{ label: t('settings.payments.fundFlow.stripeProcessing.fee.label', 'Stripe processing fee'), description: t('settings.payments.fundFlow.stripeProcessing.fee.description', '0.25% + €0.10 standard payout, 1% instant payout') }]}
              className="max-w-[220px]"
            />
          </FlowArrow>
          <FlowNode {...FLOW_NODES[2]} />
        </div>

        <ul className="space-y-1.5">
          {FLOW_BULLETS.map((b) => (
            <li key={b.key} className="flex items-start gap-2.5 text-xs text-muted-foreground">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" aria-hidden="true" />
              <span>{t(b.key, b.default)}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onLearnMoreFees}
          className="flex min-h-11 items-center gap-1.5 text-xs text-accent-foreground transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:min-h-0"
        >
          <TrendingUp className="h-3 w-3" />
          {t('settings.payments.fundFlow.learnMoreInFees', 'Learn more in Fees')}
        </button>
      </div>
    </InfoRow>
  );
}

function FlowNode({ labelKey, labelDefault, captionKey, captionDefault }: { labelKey: string; labelDefault: string; captionKey: string; captionDefault: string }) {
  const { t } = useTranslation('settings');
  return (
    <div className="flex shrink-0 flex-col items-center">
      <div className="rounded-full border border-primary/20 bg-primary/[0.10] px-4 py-2 text-sm font-medium text-accent-foreground">
        {t(labelKey, labelDefault)}
      </div>
      <p className="mt-2 max-w-[130px] text-center text-xs text-muted-foreground">{t(captionKey, captionDefault)}</p>
    </div>
  );
}

function FlowArrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2 px-2">
      <div className="relative w-full border-t-2 border-dashed border-primary/30">
        <ArrowRight className="absolute -right-1 -top-2 h-4 w-4 text-primary/60" />
      </div>
      {children}
    </div>
  );
}

// `id` is the stable comparison key (R41 decouple); titleKey/bodyKey drive display only.
const STEPS: { id: string; icon: React.ComponentType<{ className?: string }>; titleKey: string; titleDefault: string; bodyKey: string | null; bodyDefault: string | null }[] = [
  { id: 'books', icon: MessageSquare, titleKey: 'settings.payments.howItWorks.steps.books.title', titleDefault: 'Customer books via WhatsApp', bodyKey: 'settings.payments.howItWorks.steps.books.body', bodyDefault: 'Customer chats with your WhatsApp booking assistant, picks a service and a time slot.' },
  { id: 'paymentLink', icon: LinkIcon, titleKey: 'settings.payments.howItWorks.steps.paymentLink.title', titleDefault: 'Payment link is generated', bodyKey: null, bodyDefault: null },
  { id: 'completes', icon: CreditCard, titleKey: 'settings.payments.howItWorks.steps.completes.title', titleDefault: 'Customer completes payment', bodyKey: 'settings.payments.howItWorks.steps.completes.body', bodyDefault: 'Customer picks an enabled payment method and pays securely through Stripe.' },
  { id: 'confirmation', icon: CheckCircle, titleKey: 'settings.payments.howItWorks.steps.confirmation.title', titleDefault: 'Confirmation sent', bodyKey: 'settings.payments.howItWorks.steps.confirmation.body', bodyDefault: 'You and the customer both get confirmation and the booking is marked confirmed in your calendar.' },
  { id: 'funds', icon: Wallet, titleKey: 'settings.payments.howItWorks.steps.funds.title', titleDefault: 'Funds arrive in your account', bodyKey: 'settings.payments.howItWorks.steps.funds.body', bodyDefault: 'After processing, funds are transferred to your bank, depending on the payout speed you selected.' },
];

export function HowItWorksSection({
  open,
  onOpenChange,
  paymentRequired,
  onScrollTo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentRequired: boolean;
  onScrollTo: (id: string) => void;
}) {
  const { t } = useTranslation('settings');
  return (
    <InfoRow
      open={open}
      onOpenChange={onOpenChange}
      title={t('settings.payments.howItWorks.title', 'How it works (payment flow)')}
      subtitle={t('settings.payments.howItWorks.subtitle', 'Step-by-step: how customers pay for a booking')}
    >
      <ol className="space-y-4">
        {STEPS.map((step, i) => (
          <li key={step.id} className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/[0.12] text-xs font-medium text-accent-foreground">
              {i + 1}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <step.icon className="h-4 w-4 text-primary" />
                <h5 className="text-sm font-medium text-foreground">{t(step.titleKey, step.titleDefault)}</h5>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {step.id === 'paymentLink' ? (
                  paymentRequired ? (
                    t('settings.payments.howItWorks.paymentLinkRequired', 'Customer gets a secure payment link and must pay to confirm the booking.')
                  ) : (
                    <>
                      {t('settings.payments.howItWorks.paymentLinkOptional', 'Customer can choose to pay now or on-site.')}{' '}
                      <button
                        type="button"
                        onClick={() => onScrollTo('payment-flexibility-section')}
                        className="text-accent-foreground hover:underline"
                      >
                        {t('settings.payments.howItWorks.paymentLinkOptionalLink', 'Depending on the settings you choose above.')}
                      </button>
                    </>
                  )
                ) : (
                  step.bodyKey ? t(step.bodyKey, step.bodyDefault as string) : step.bodyDefault
                )}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </InfoRow>
  );
}

interface FeeRow {
  name: string;
  fee: string;
  currencyInfo?: boolean;
}

// `fee` holds verbatim numeric fee data (skip translation). `sameAsCards` rows show a
// translatable phrase instead of a number.
const FEE_ROWS: (FeeRow & { sameAsCards?: boolean })[] = [
  { name: 'iDEAL', fee: '€0.29' },
  { name: 'Cards (EEA)', fee: '1.5% + €0.25', currencyInfo: true },
  { name: 'Cards (UK)', fee: '2.5% + €0.25', currencyInfo: true },
  { name: 'Cards (International)', fee: '3.25% + €0.25', currencyInfo: true },
  { name: 'Apple Pay', fee: 'Same as cards', sameAsCards: true, currencyInfo: true },
  { name: 'Bancontact', fee: '€0.35', currencyInfo: true },
  { name: 'BLIK', fee: '1.6% + €0.25', currencyInfo: true },
  { name: 'TWINT', fee: '1.9% + CHF 0.30' },
  { name: 'Revolut Pay', fee: '1.5% + €0.25' },
  { name: 'Sofort', fee: '1.4% + €0.25' },
  { name: 'EPS', fee: '1.6% + €0.25' },
  { name: 'Przelewy24', fee: '2.2% + €0.30' },
  { name: 'Pay by Bank', fee: '~1.5% + £0.20' },
  { name: 'Cartes Bancaires', fee: 'Same as cards', sameAsCards: true, currencyInfo: true },
  { name: 'Google Pay', fee: 'Same as cards', sameAsCards: true, currencyInfo: true },
];

export function FeesSection({
  open,
  onOpenChange,
  onCurrencyInfo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCurrencyInfo: () => void;
}) {
  const { t } = useTranslation('settings');
  return (
    <InfoRow
      open={open}
      onOpenChange={onOpenChange}
      id="fees-section"
      title={t('settings.payments.fees.title', 'Fees')}
      subtitle={t('settings.payments.fees.subtitle', 'Payment processing fees overview')}
    >
      <div className="space-y-5">
        <div>
          <h5 className="mb-2 text-xs font-medium text-muted-foreground">{t('settings.payments.fees.methodFeesHeading', 'Payment method fees')}</h5>
          <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
            {FEE_ROWS.map((row, i) => (
              <div
                key={row.name}
                className={cn(
                  'flex items-center justify-between px-3 py-2 transition-colors hover:bg-white/[0.02]',
                  i > 0 && 'border-t border-white/[0.05]',
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{row.name}</span>
                  {row.currencyInfo && (
                    // Passive marker (NOT a tap target): each per-row icon opened the SAME
                    // generic currency dialog as the "Currency conversion fee" control below,
                    // so in a dense 32px row it was a redundant sub-44 hit area that can't be
                    // grown without crowding its neighbours. Kept as a visual signal that this
                    // method may settle in card currency; the one tappable explainer lives below.
                    <Info aria-hidden="true" className="h-3 w-3 shrink-0 text-subtle-foreground" />
                  )}
                </div>
                <span className="text-xs font-medium tabular-nums text-muted-foreground">
                  {row.sameAsCards ? t('settings.payments.fees.sameAsCards', 'Same as cards') : row.fee}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-white/[0.05] pt-4">
          <div className="mb-1.5 flex items-center gap-1">
            <h5 className="text-xs font-medium text-muted-foreground">{t('settings.payments.fees.currencyConversionHeading', 'Currency conversion fee')}</h5>
            {/* The one tappable currency explainer (the per-row icons above are passive markers).
                Negative-margin idiom: 44px tap target on mobile, 24px on desktop, no layout shift. */}
            <button
              type="button"
              onClick={onCurrencyInfo}
              className="-m-2.5 flex h-11 w-11 items-center justify-center rounded-full text-subtle-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:-m-1 md:h-6 md:w-6"
              aria-label={t('settings.payments.fees.currencyConversionAria', 'About the currency conversion fee')}
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('settings.payments.fees.currencyConversionBody', "An extra 2% fee applies when the customer's payment currency differs from your account currency (more likely for the card-based methods marked above).")}
          </p>
        </div>

        <div className="border-t border-white/[0.05] pt-4">
          <h5 className="mb-2 text-xs font-medium text-muted-foreground">{t('settings.payments.fees.structureHeading', 'Fee structure')}</h5>
          <dl className="space-y-2 text-xs text-muted-foreground">
            <FeeGroup term={t('settings.payments.fees.structure.stripe.term', 'Stripe processing fees')}>
              <div>{t('settings.payments.fees.structure.stripe.standard', '• Standard payout: 0.25% + €0.10 per transaction')}</div>
              <div>{t('settings.payments.fees.structure.stripe.instant', '• Instant payout: 1% per transaction')}</div>
            </FeeGroup>
            <FeeGroup term={t('settings.payments.fees.structure.platform.term', 'Platform fees')}>
              <div>{t('settings.payments.fees.structure.platform.standard', '• Standard payout: 1.9% + €0.25 per booking')}</div>
              <div>{t('settings.payments.fees.structure.platform.instant', '• Instant payout: 1.9% + €0.35 per booking')}</div>
            </FeeGroup>
            <FeeGroup term={t('settings.payments.fees.structure.method.term', 'Payment method fees')}>
              <div>{t('settings.payments.fees.structure.method.body', 'Vary by method (e.g. iDEAL €0.29, card fees vary)')}</div>
            </FeeGroup>
          </dl>
        </div>

        <div className="border-t border-white/[0.05] pt-4">
          <h5 className="mb-2 text-xs font-medium text-muted-foreground">{t('settings.payments.fees.exampleHeading', 'Fee impact example')}</h5>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <dl className="space-y-1 text-xs">
              {[
                [t('settings.payments.fees.example.bookingAmount', 'Booking amount'), '€100.00'],
                [t('settings.payments.fees.example.methodFee', 'Payment method fee (iDEAL)'), '-€0.29'],
                [t('settings.payments.fees.example.platformFee', 'Platform fee (1.9% + €0.25)'), '-€2.15'],
                [t('settings.payments.fees.example.stripeProcessing', 'Stripe processing (0.25% + €0.10)'), '-€0.35'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-muted-foreground">
                  <dt>{label}</dt>
                  <dd className="tabular-nums">{value}</dd>
                </div>
              ))}
              <div className="mt-1 flex justify-between border-t border-white/[0.06] pt-1 font-medium text-foreground">
                <dt>{t('settings.payments.fees.example.netPayout', 'Net payout')}</dt>
                <dd className="tabular-nums">€97.21</dd>
              </div>
            </dl>
          </div>
          <p className="mt-1.5 text-xs text-subtle-foreground">
            {t('settings.payments.fees.deductedNote', 'All fees are deducted from the booking amount before payout.')}
          </p>
        </div>
      </div>
    </InfoRow>
  );
}

function FeeGroup({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="mb-1">{term}</dt>
      <dd className="ml-3.5 space-y-0.5">{children}</dd>
    </div>
  );
}
