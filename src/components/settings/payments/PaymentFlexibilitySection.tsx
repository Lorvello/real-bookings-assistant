import React from 'react';
import { useTranslation } from 'react-i18next';
import { Wallet, Lock, Settings as SettingsIcon, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SettingsSection } from '../SettingsSection';
import { SettingsField } from '../SettingsField';

/**
 * Refund-policy presets (AS-3). The owner picks a common policy with a button
 * instead of writing free text; "custom" reveals the textarea for an own policy.
 *
 * The selected preset writes its CANONICAL localized sentence into the same
 * `refundPolicy` string that is persisted to `payment_settings.refund_policy_text`
 * and read verbatim by the WhatsApp agent every turn (AS-2). So the agent honors a
 * preset exactly as it honors hand-written text, and the unambiguous canonical
 * sentence also reduces the AS-2w field-confusion watch-item. The active preset is
 * DERIVED from the stored string (single source of truth), so it round-trips on
 * re-open with no extra persisted state. A non-empty value that matches no preset
 * resolves to 'custom'; an empty value resolves to no selection.
 */
type RefundPreset = 'free24' | 'free48' | 'none' | 'custom';

/** Canonical, localized policy sentence for each non-custom preset. */
function refundPresetText(preset: Exclude<RefundPreset, 'custom'>, t: (k: string, d: string) => string): string {
  switch (preset) {
    case 'free24':
      return t(
        'settings.payments.flexibility.presets.free24Text',
        'Free cancellation up to 24 hours before the appointment. After that, no refund.',
      );
    case 'free48':
      return t(
        'settings.payments.flexibility.presets.free48Text',
        'Free cancellation up to 48 hours before the appointment. After that, no refund.',
      );
    case 'none':
      return t(
        'settings.payments.flexibility.presets.noneText',
        'No refunds. All bookings are final.',
      );
  }
}

/** Derive the active preset from the stored policy string (single source of truth). */
function derivePreset(refundPolicy: string, t: (k: string, d: string) => string): RefundPreset | null {
  const value = refundPolicy.trim();
  if (!value) return null;
  if (value === refundPresetText('free24', t)) return 'free24';
  if (value === refundPresetText('free48', t)) return 'free48';
  if (value === refundPresetText('none', t)) return 'none';
  return 'custom';
}

interface PaymentFlexibilitySectionProps {
  // Refund & cancellation policy (feeds the AI agent via business_overview).
  refundPolicy: string;
  onRefundPolicyChange: (value: string) => void;
  onSaveRefundPolicy: () => void;
  /** AS-3: select a preset -> writes its canonical sentence AND persists it in one click. */
  onSelectRefundPreset: (text: string) => void;
  savingRefundPolicy: boolean;

  // Master flexibility toggle. `paymentRequired === true` means upfront payment is mandatory.
  paymentRequired: boolean;
  onToggleOptional: (optional: boolean) => void;

  // Required-upfront branch.
  deadlineHours: string;
  onDeadlineChange: (value: string) => void;
  onDeadlineBlur: () => void;
  autoCancel: boolean;
  onToggleAutoCancel: (enabled: boolean) => void;

  // Optional branch — payment timing choices.
  payOnSiteEnabled: boolean;
  onTogglePayOnSite: (enabled: boolean) => void;
  installmentsEnabled: boolean;
  onToggleInstallments: (enabled: boolean) => void;
  /**
   * REAL tier entitlement for installments: true only when subscription_tier is
   * 'professional' or 'enterprise'. This MUST match the edge fn's tier gate, NOT the
   * looser `hasFullAccess` (which is true for any trial/subscriber regardless of tier).
   * A non-pro user with this false sees the switch disabled + an upgrade hint, so they
   * can never fire the call the backend would reject.
   */
  canUseInstallments: boolean;
  installmentConfigOpen: boolean;
  onToggleInstallmentConfig: () => void;
  /** The InstallmentSettings editor, rendered by the orchestrator (needs profile + handlers). */
  installmentSlot: React.ReactNode;

  saving: boolean;
}

/** Horizontal label-left / control-right row — the one idiom for config toggles and compact inputs. */
function FlexRow({
  title,
  description,
  htmlFor,
  control,
  className,
}: {
  title: string;
  description: string;
  htmlFor?: string;
  control: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="space-y-0.5">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
            {title}
          </label>
        ) : (
          <p className="text-sm font-medium text-foreground">{title}</p>
        )}
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">{control}</div>
    </div>
  );
}

function TimingRow({
  active,
  activeColor,
  title,
  description,
  badge,
  control,
}: {
  active: boolean;
  activeColor: string;
  title: string;
  description: string;
  badge?: React.ReactNode;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <div className="flex items-center gap-3">
        <span className={cn('h-2 w-2 shrink-0 rounded-full', active ? activeColor : 'bg-muted-foreground/40')} />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{title}</span>
            {badge}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">{control}</div>
    </div>
  );
}

/**
 * Payment-flexibility controls: refund policy (agent-facing), the require-vs-optional
 * master toggle, and the branch beneath it (deadline + auto-cancel when required;
 * pay-now / pay-on-site / installments when optional). Pure presentational — the
 * orchestrator owns the cascade logic and feeds the InstallmentSettings editor in.
 */
export function PaymentFlexibilitySection(props: PaymentFlexibilitySectionProps) {
  const {
    refundPolicy,
    onRefundPolicyChange,
    onSaveRefundPolicy,
    onSelectRefundPreset,
    savingRefundPolicy,
    paymentRequired,
    onToggleOptional,
    deadlineHours,
    onDeadlineChange,
    onDeadlineBlur,
    autoCancel,
    onToggleAutoCancel,
    payOnSiteEnabled,
    onTogglePayOnSite,
    installmentsEnabled,
    onToggleInstallments,
    canUseInstallments,
    installmentConfigOpen,
    onToggleInstallmentConfig,
    installmentSlot,
    saving,
  } = props;
  const { t } = useTranslation('settings');
  // Adapter: react-i18next's t has a broad signature; our preset helpers only need (key, default).
  const tt = (k: string, d: string) => t(k, d);

  // The active choice is DERIVED from the stored string (single source of truth) so it
  // round-trips on re-open. A non-empty value that matches a canonical preset selects
  // that preset; a non-empty value that matches none is 'custom'; an empty value is
  // unselected. The one thing the string cannot express is "the owner clicked Custom but
  // hasn't typed yet" (value is empty), so we hold that transient intent locally and
  // clear it the moment a preset is picked. This keeps the editor visible while typing.
  const [customMode, setCustomMode] = React.useState(false);
  const derived = derivePreset(refundPolicy, tt);
  const activePreset: RefundPreset | null = derived === 'custom' ? 'custom' : customMode ? 'custom' : derived;

  const presetOptions: { id: Exclude<RefundPreset, 'custom'>; label: string }[] = [
    { id: 'free24', label: t('settings.payments.flexibility.presets.free24Label', 'Free cancellation up to 24 hours') },
    { id: 'free48', label: t('settings.payments.flexibility.presets.free48Label', 'Free cancellation up to 48 hours') },
    { id: 'none', label: t('settings.payments.flexibility.presets.noneLabel', 'No refund (all bookings final)') },
  ];

  return (
    <SettingsSection icon={Wallet} title={t('settings.payments.flexibility.title', 'Payment flexibility')} usedByAgent>
      <div className="space-y-6">
        {/* Refund and cancellation policy: preset buttons plus an optional custom free text. */}
        <div className="border-b border-white/[0.05] pb-6">
          <SettingsField
            label={t('settings.payments.flexibility.refundPolicyLabel', 'Refund & cancellation policy')}
            description={t('settings.payments.flexibility.refundPolicyDescription', 'Shown to your AI assistant so it answers refund and cancellation questions correctly.')}
          >
            {/* Radiogroup of common policies; selecting one writes its canonical sentence
                and saves immediately so the agent honors it next turn. */}
            <div
              role="radiogroup"
              aria-label={t('settings.payments.flexibility.presets.groupLabel', 'Refund policy')}
              className="space-y-2"
            >
              {presetOptions.map((opt) => {
                const selected = activePreset === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={savingRefundPolicy}
                    onClick={() => {
                      setCustomMode(false);
                      onSelectRefundPreset(refundPresetText(opt.id, tt));
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      'disabled:cursor-not-allowed disabled:opacity-60',
                      selected
                        ? 'border-primary/50 bg-primary/[0.08]'
                        : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]',
                    )}
                  >
                    <span className={cn('text-sm font-medium', selected ? 'text-foreground' : 'text-muted-foreground')}>
                      {opt.label}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                        selected ? 'border-primary bg-primary text-primary-foreground' : 'border-white/20',
                      )}
                    >
                      {selected && <Check className="h-3 w-3" />}
                    </span>
                  </button>
                );
              })}

              {/* Custom option reveals the free-text policy field. */}
              <button
                type="button"
                role="radio"
                aria-checked={activePreset === 'custom'}
                onClick={() => {
                  // Reveal the textarea and keep it revealed while empty. If switching FROM a
                  // preset, clear the canonical sentence so the owner starts from their own words.
                  setCustomMode(true);
                  if (derived !== 'custom') onRefundPolicyChange('');
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  activePreset === 'custom'
                    ? 'border-primary/50 bg-primary/[0.08]'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]',
                )}
              >
                <span className={cn('text-sm font-medium', activePreset === 'custom' ? 'text-foreground' : 'text-muted-foreground')}>
                  {t('settings.payments.flexibility.presets.customLabel', 'Custom policy')}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                    activePreset === 'custom' ? 'border-primary bg-primary text-primary-foreground' : 'border-white/20',
                  )}
                >
                  {activePreset === 'custom' && <Check className="h-3 w-3" />}
                </span>
              </button>
            </div>
          </SettingsField>

          {/* Free-text editor shows only when "custom" is the active choice. */}
          {activePreset === 'custom' && (
            <div className="mt-3 space-y-3">
              <Textarea
                id="refund-policy"
                aria-label={t('settings.payments.flexibility.refundPolicyLabel', 'Refund & cancellation policy')}
                value={refundPolicy}
                onChange={(e) => onRefundPolicyChange(e.target.value)}
                placeholder={t('settings.payments.flexibility.refundPolicyPlaceholder', 'e.g. Free cancellation up to 24h before the appointment; no refund afterwards.')}
                rows={3}
              />
              <Button size="sm" onClick={onSaveRefundPolicy} disabled={savingRefundPolicy}>
                {savingRefundPolicy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {savingRefundPolicy ? t('settings.payments.flexibility.saving', 'Saving…') : t('settings.payments.flexibility.savePolicy', 'Save policy')}
              </Button>
            </div>
          )}
        </div>

        {/* Require vs optional master toggle */}
        <FlexRow
          title={t('settings.payments.flexibility.makeOptionalTitle', 'Make payment optional')}
          description={t('settings.payments.flexibility.makeOptionalDescription', 'On: customers choose when to pay. Off: payment is required upfront before a booking is confirmed.')}
          control={
            <Switch
              checked={!paymentRequired}
              onCheckedChange={onToggleOptional}
              disabled={saving}
              aria-label={t('settings.payments.flexibility.makeOptionalAria', 'Make payment optional')}
            />
          }
        />

        {paymentRequired ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.05] p-4">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{t('settings.payments.flexibility.requiredUpfrontTitle', 'Payment required upfront')}</span>{' '}
                {t('settings.payments.flexibility.requiredUpfrontBody', 'customers must pay online before their booking is confirmed.')}
              </p>
            </div>

            <div className="space-y-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <FlexRow
                title={t('settings.payments.flexibility.deadlineTitle', 'Payment deadline')}
                description={t('settings.payments.flexibility.deadlineDescription', 'How long a customer has to pay before the slot can be released.')}
                htmlFor="payment-deadline"
                control={
                  <>
                    <Input
                      id="payment-deadline"
                      type="number"
                      min={1}
                      value={deadlineHours}
                      onChange={(e) => onDeadlineChange(e.target.value)}
                      onBlur={onDeadlineBlur}
                      disabled={saving}
                      className="w-20"
                      aria-label={t('settings.payments.flexibility.deadlineAria', 'Payment deadline in hours')}
                    />
                    <span className="text-sm text-muted-foreground">{t('settings.payments.flexibility.hours', 'hours')}</span>
                  </>
                }
              />
              <FlexRow
                className="border-t border-white/[0.05] pt-5"
                title={t('settings.payments.flexibility.autoCancelTitle', 'Auto-cancel unpaid bookings')}
                description={t('settings.payments.flexibility.autoCancelDescription', 'Release the slot automatically when the deadline passes without payment.')}
                control={
                  <Switch
                    checked={autoCancel}
                    onCheckedChange={onToggleAutoCancel}
                    disabled={saving}
                    aria-label={t('settings.payments.flexibility.autoCancelAria', 'Auto-cancel unpaid bookings')}
                  />
                }
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('settings.payments.flexibility.chooseOptions', 'Choose which payment options customers can pick from:')}</p>

            <TimingRow
              active
              activeColor="bg-success"
              title={t('settings.payments.flexibility.payNowTitle', 'Pay now')}
              description={t('settings.payments.flexibility.payNowDescription', 'Pay online immediately')}
              control={
                <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-xs text-subtle-foreground">
                  {t('settings.payments.flexibility.alwaysOn', 'Always on')}
                </span>
              }
            />

            <TimingRow
              active={payOnSiteEnabled}
              activeColor="bg-warning"
              title={t('settings.payments.flexibility.payOnSiteTitle', 'Pay on-site')}
              description={t('settings.payments.flexibility.payOnSiteDescription', 'Pay when the service is provided')}
              control={
                <Switch
                  checked={payOnSiteEnabled}
                  onCheckedChange={onTogglePayOnSite}
                  disabled={saving}
                  aria-label={t('settings.payments.flexibility.payOnSiteAria', 'Allow pay on-site')}
                />
              }
            />

            <TimingRow
              active={installmentsEnabled && canUseInstallments}
              activeColor="bg-primary"
              title={t('settings.payments.flexibility.installmentsTitle', 'Pay in installments')}
              description={t('settings.payments.flexibility.installmentsDescription', 'Split into multiple payments')}
              badge={
                !canUseInstallments ? (
                  <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-medium text-gold-foreground">
                    {t('settings.payments.flexibility.proBadge', 'Pro')}
                  </span>
                ) : undefined
              }
              control={
                <>
                  {installmentsEnabled && canUseInstallments && (
                    <Button variant="ghost" size="sm" onClick={onToggleInstallmentConfig} className="text-xs">
                      <SettingsIcon className="mr-1 h-3 w-3" />
                      {t('settings.payments.flexibility.configure', 'Configure')}
                    </Button>
                  )}
                  <Switch
                    checked={installmentsEnabled && canUseInstallments}
                    onCheckedChange={onToggleInstallments}
                    disabled={saving || !canUseInstallments}
                    aria-label={t('settings.payments.flexibility.installmentsAria', 'Allow installment payments')}
                    aria-describedby={!canUseInstallments ? 'installments-upgrade-hint' : undefined}
                  />
                </>
              }
            />

            {/* Non-pro upgrade hint. Tied to the disabled switch via aria-describedby so
                screen readers announce WHY it is disabled, not just that it is greyed. */}
            {!canUseInstallments && (
              <p id="installments-upgrade-hint" className="px-4 text-xs text-muted-foreground">
                {t('settings.payments.flexibility.installmentsUpgradeHint', 'Available on the Professional plan. Upgrade to let customers split payments.')}
              </p>
            )}

            {installmentsEnabled && canUseInstallments && installmentConfigOpen && (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">{installmentSlot}</div>
            )}
          </div>
        )}
      </div>
    </SettingsSection>
  );
}
