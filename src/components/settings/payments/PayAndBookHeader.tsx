import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, AlertCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { SettingsSection } from '../SettingsSection';

interface PayAndBookHeaderProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  /** Disable the master switch (saving in flight, or Stripe setup not complete). */
  disabled?: boolean;
  isSetupComplete: boolean;
  hasStripeAccount: boolean;
}

/**
 * The master "Pay & Book" enable section — first focus of the Pay & Book tab.
 * Pure presentational: the orchestrator owns the toggle handler + the cascade
 * logic that resets installments when payments are switched off.
 */
export function PayAndBookHeader({
  enabled,
  onToggle,
  disabled,
  isSetupComplete,
  hasStripeAccount,
}: PayAndBookHeaderProps) {
  const { t } = useTranslation('settings');
  return (
    <SettingsSection
      icon={Shield}
      title={t('settings.payments.header.title', 'Pay & Book')}
      description={t(
        'settings.payments.header.description',
        'Collect secure pre-payments on bookings to cut no-shows and lock in revenue upfront, paid out to your own account through Stripe.',
      )}
      action={
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          disabled={disabled || !isSetupComplete}
          aria-label={t('settings.payments.header.toggleAria', 'Enable Pay & Book')}
          data-pay-book-toggle
        />
      }
    >
      <p className="text-sm leading-6 text-muted-foreground">
        {t(
          'settings.payments.header.intro',
          'When enabled, customers can pay for a booking online, through WhatsApp or your booking page, before the slot is confirmed.',
        )}
      </p>

      {!isSetupComplete && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/[0.08] p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
          <p className="text-sm leading-6 text-warning-foreground">
            {hasStripeAccount
              ? t(
                  'settings.payments.header.finishSetup',
                  'Finish setting up your Stripe account below to switch Pay & Book on.',
                )
              : t(
                  'settings.payments.header.connectFirst',
                  'Connect a Stripe account below to switch Pay & Book on.',
                )}
          </p>
        </div>
      )}
    </SettingsSection>
  );
}
