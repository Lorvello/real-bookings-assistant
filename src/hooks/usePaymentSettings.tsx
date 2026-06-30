import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { isTestMode } from '@/utils/stripeConfig';
import type { PaymentSettings } from '@/types/payments';

export const usePaymentSettings = (calendarId?: string) => {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation('notifications');

  // The last value we KNOW the DB holds (server-confirmed on fetch/save). Optimistic
  // toggles paint ahead of the await; on a save failure we revert local state to this
  // truth so a money-relevant toggle never stays visually wrong vs the backend
  // (FQ-A-PAY). A ref (not state) so updateSettings reads the latest committed value
  // synchronously, even when several optimistic toggles fire in the same tick.
  const confirmedSettings = useRef<PaymentSettings | null>(null);

  const parseSettings = (data: any): PaymentSettings => ({
    ...data,
    enabled_payment_methods: Array.isArray(data.enabled_payment_methods) 
      ? data.enabled_payment_methods as string[]
      : ['ideal'],
    payout_option: (data.payout_option as 'standard' | 'instant') || 'standard',
    payment_optional: data.payment_optional ?? false,
    allowed_payment_timing: Array.isArray(data.allowed_payment_timing)
      ? data.allowed_payment_timing as string[]
      : ['pay_now'],
  });

  const fetchSettings = async () => {
    if (!calendarId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('calendar_id', calendarId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const parsed = parseSettings(data);
        confirmedSettings.current = parsed;
        setSettings(parsed);
      }
    } catch (error) {
      console.error('Error fetching payment settings:', error);
      toast({
        title: t('paymentSettings.loadErrorTitle', "Error"),
        description: t('paymentSettings.loadErrorDescription', "Failed to load payment settings"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Persist a partial payment-settings change.
   *
   * `optimistic`: when true (the toggles pass it), local state is painted ahead of
   * the await for instant UI feedback. If the save then FAILS (network / RLS / permission),
   * local state is REVERTED to the last server-confirmed value (`confirmedSettings`) so a
   * money-relevant toggle (secure payments, payment required, pay-on-site, payout speed)
   * never stays stuck in a state that disagrees with the DB (FQ-A-PAY). The destructive
   * error toast is a role=status live region, so the failure is announced, not silent.
   * Pass `optimistic: false` for callers that gate their UI on the returned boolean
   * (payment methods, payout option) and therefore must not paint before confirmation.
   */
  const updateSettings = async (
    updates: Partial<PaymentSettings>,
    options?: { optimistic?: boolean },
  ) => {
    if (!calendarId) return false;

    const optimistic = options?.optimistic ?? false;
    // Capture the truth to roll back to BEFORE we paint optimistically.
    const snapshot = confirmedSettings.current;
    if (optimistic) {
      setSettings(prev => (prev ? { ...prev, ...updates } : prev));
    }

    try {
      setSaving(true);

      // UPSERT on calendar_id. Branching insert-vs-update on local `settings` state
      // was buggy: a default payment_settings row is auto-created by a trigger when
      // the calendar is created, so when local state was stale-null the insert path
      // hit the calendar_id UNIQUE constraint -> 'Failed to update payment settings'.
      // Upsert handles both cases atomically regardless of local state.
      const { data, error } = await supabase
        .from('payment_settings')
        .upsert({ calendar_id: calendarId, ...updates }, { onConflict: 'calendar_id' })
        .select()
        .single();

      if (error) throw error;
      const parsed = parseSettings(data);
      confirmedSettings.current = parsed;
      setSettings(parsed);

      toast({
        title: t('paymentSettings.updateSuccessTitle', "Success"),
        description: t('paymentSettings.updateSuccessDescription', "Payment settings updated successfully"),
      });

      return true;
    } catch (error) {
      console.error('Error updating payment settings:', error);
      // Revert the optimistic paint to the last value we KNOW the DB holds, so the
      // toggle can never lie about a money-relevant setting after a failed save.
      if (optimistic) {
        setSettings(snapshot);
      }
      toast({
        title: t('paymentSettings.updateErrorTitle', "Error"),
        description: t('paymentSettings.updateErrorDescription', "Failed to update payment settings"),
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toggleSecurePayments = async (enabled: boolean) => {
    if (!enabled) {
      // Cascade: reset all related settings when Pay & Book is disabled.
      // Optimistic paint + revert-on-failure handled centrally in updateSettings.
      return await updateSettings({
        secure_payments_enabled: false,
        payment_required_for_booking: true,  // Reset to required
        payment_optional: false,             // Reset to not optional
      }, { optimistic: true });
    }
    return await updateSettings({ secure_payments_enabled: enabled }, { optimistic: true });
  };

  const togglePaymentRequired = async (required: boolean) => {
    return await updateSettings({ payment_required_for_booking: required }, { optimistic: true });
  };

  const updatePaymentMethods = async (methods: string[]) => {
    return await updateSettings({ enabled_payment_methods: methods });
  };

  const togglePaymentOptional = async (optional: boolean) => {
    return await updateSettings({ payment_optional: optional }, { optimistic: true });
  };

  const updateAllowedPaymentTiming = async (timings: string[]) => {
    return await updateSettings({ allowed_payment_timing: timings }, { optimistic: true });
  };

  const updatePayoutOption = async (option: 'standard' | 'instant') => {
    // First update local settings
    const success = await updateSettings({ payout_option: option });
    
    if (success && calendarId) {
      try {
        // Sync to Stripe
        const { error } = await supabase.functions.invoke('sync-payout-settings', {
          body: {
            calendarId,
            payoutOption: option,
            testMode: isTestMode()
          }
        });

        if (error) {
          console.error('Failed to sync payout settings to Stripe:', error);
          toast({
            title: t('paymentSettings.payoutSyncWarningTitle', "Warning"),
            description: t('paymentSettings.payoutSyncWarningDescription', "Settings saved locally but failed to sync to Stripe"),
            variant: "destructive",
          });
        } else {
          toast({
            title: t('paymentSettings.payoutSyncSuccessTitle', "Success"),
            description: t('paymentSettings.payoutSyncSuccessDescription', "Payout settings updated to {{option}} in Stripe", { option }),
          });
        }
      } catch (error) {
        console.error('Error syncing payout settings:', error);
      }
    }
    
    return success;
  };

  useEffect(() => {
    fetchSettings();
  }, [calendarId]);

  return {
    settings,
    loading,
    saving,
    updateSettings,
    toggleSecurePayments,
    togglePaymentRequired,
    updatePaymentMethods,
    togglePaymentOptional,
    updateAllowedPaymentTiming,
    updatePayoutOption,
    refetch: fetchSettings
  };
};