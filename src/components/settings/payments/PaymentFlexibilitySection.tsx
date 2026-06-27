import React from 'react';
import { useTranslation } from 'react-i18next';
import { Wallet, Lock, Settings as SettingsIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SettingsSection } from '../SettingsSection';
import { SettingsField } from '../SettingsField';

interface PaymentFlexibilitySectionProps {
  // Refund & cancellation policy (feeds the AI agent via business_overview).
  refundPolicy: string;
  onRefundPolicyChange: (value: string) => void;
  onSaveRefundPolicy: () => void;
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
  hasFullAccess: boolean;
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
    hasFullAccess,
    installmentConfigOpen,
    onToggleInstallmentConfig,
    installmentSlot,
    saving,
  } = props;
  const { t } = useTranslation('settings');

  return (
    <SettingsSection icon={Wallet} title={t('settings.payments.flexibility.title', 'Payment flexibility')} usedByAgent>
      <div className="space-y-6">
        {/* Refund & cancellation policy */}
        <div className="border-b border-white/[0.05] pb-6">
          <SettingsField
            label={t('settings.payments.flexibility.refundPolicyLabel', 'Refund & cancellation policy')}
            htmlFor="refund-policy"
            description={t('settings.payments.flexibility.refundPolicyDescription', 'Shown to your AI assistant so it answers refund and cancellation questions correctly.')}
          >
            <Textarea
              id="refund-policy"
              value={refundPolicy}
              onChange={(e) => onRefundPolicyChange(e.target.value)}
              placeholder={t('settings.payments.flexibility.refundPolicyPlaceholder', 'e.g. Free cancellation up to 24h before the appointment; no refund afterwards.')}
              rows={3}
            />
          </SettingsField>
          <div className="mt-3">
            <Button size="sm" onClick={onSaveRefundPolicy} disabled={savingRefundPolicy}>
              {savingRefundPolicy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {savingRefundPolicy ? t('settings.payments.flexibility.saving', 'Saving…') : t('settings.payments.flexibility.savePolicy', 'Save policy')}
            </Button>
          </div>
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
              active={installmentsEnabled}
              activeColor="bg-primary"
              title={t('settings.payments.flexibility.installmentsTitle', 'Pay in installments')}
              description={t('settings.payments.flexibility.installmentsDescription', 'Split into multiple payments')}
              badge={
                !hasFullAccess ? (
                  <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-medium text-gold-foreground">
                    {t('settings.payments.flexibility.proBadge', 'Pro')}
                  </span>
                ) : undefined
              }
              control={
                <>
                  {installmentsEnabled && hasFullAccess && (
                    <Button variant="ghost" size="sm" onClick={onToggleInstallmentConfig} className="text-xs">
                      <SettingsIcon className="mr-1 h-3 w-3" />
                      {t('settings.payments.flexibility.configure', 'Configure')}
                    </Button>
                  )}
                  <Switch
                    checked={installmentsEnabled}
                    onCheckedChange={onToggleInstallments}
                    disabled={saving || !hasFullAccess}
                    aria-label={t('settings.payments.flexibility.installmentsAria', 'Allow installment payments')}
                  />
                </>
              }
            />

            {installmentsEnabled && hasFullAccess && installmentConfigOpen && (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">{installmentSlot}</div>
            )}
          </div>
        )}
      </div>
    </SettingsSection>
  );
}
