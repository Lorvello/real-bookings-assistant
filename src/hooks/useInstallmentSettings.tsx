import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { isTestMode } from '@/utils/stripeConfig';

interface InstallmentPlan {
  type: 'preset' | 'custom';
  preset?: '100_at_booking' | '50_50' | '25_25_50' | 'fixed_deposit';
  deposits?: Array<{
    percentage?: number;
    amount?: number;
    timing: 'now' | 'appointment' | 'hours_after';
    hours?: number;
  }>;
  fixed_deposit_amount?: number;
}

interface InstallmentSettings {
  enabled: boolean;
  allowCustomerChoice: boolean;
  defaultPlan: InstallmentPlan;
  applyToServices?: 'all' | 'selected';
  selectedServices?: string[];
  serviceConfigs?: Array<{
    serviceTypeId: string;
    enabled: boolean;
    plan: InstallmentPlan;
    allowCustomerChoice: boolean;
  }>;
}

export const useInstallmentSettings = () => {
  const [settings, setSettings] = useState<InstallmentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation('notifications');

  const fetchSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('installments_enabled, default_installment_plan, allow_customer_installment_choice')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setSettings({
        enabled: data.installments_enabled || false,
        allowCustomerChoice: data.allow_customer_installment_choice ?? true,
        defaultPlan: (data.default_installment_plan as any) || {
          type: 'preset',
          preset: '50_50',
          deposits: [
            { percentage: 50, timing: 'now' },
            { percentage: 50, timing: 'appointment' }
          ]
        }
      });
    } catch (error) {
      console.error('Error fetching installment settings:', error);
      toast({
        title: t('installmentSettings.loadErrorTitle', "Error loading settings"),
        description: t('installmentSettings.loadErrorDescription', "Could not load installment settings."),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (settingsData: Partial<InstallmentSettings>) => {
    if (!user) return false;

    try {
      // Merge with existing settings
      const mergedSettings = {
        ...settings,
        ...settingsData
      };

      const { data, error } = await supabase.functions.invoke('manage-installment-settings', {
        body: {
          ...mergedSettings,
          test_mode: isTestMode()
        }
      });

      // supabase-js raises a FunctionsHttpError for any non-2xx and hides the JSON
      // body behind error.context (a Response). For the typed 403 tier-gate we parse
      // that body and surface a friendly "upgrade to Pro" toast instead of the raw
      // "Edge Function returned a non-2xx status code". The UI already disables the
      // toggle for non-pro users, so this path is only hit on a race/edge case, but it
      // must still fail gracefully.
      if (error) {
        let tierRequired = false;
        try {
          const body = await (error as any)?.context?.json?.();
          if (body?.error === 'tier_required') tierRequired = true;
        } catch (_) { /* body not JSON / already consumed */ }
        if (tierRequired) {
          toast({
            title: t('installmentSettings.tierRequiredTitle', 'Upgrade to Professional'),
            description: t('installmentSettings.tierRequiredDescription', 'Installment payments are available on the Professional plan or higher.'),
            variant: "destructive"
          });
          return false;
        }
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to update settings');
      }

      setSettings(mergedSettings as InstallmentSettings);
      toast({
        title: t('installmentSettings.saveSuccessTitle', "Settings saved"),
        description: t('installmentSettings.saveSuccessDescription', "Installment settings have been updated successfully."),
      });
      return true;
    } catch (error) {
      console.error('Error updating installment settings:', error);
      toast({
        title: t('installmentSettings.saveErrorTitle', "Error saving settings"),
        description: error.message || t('installmentSettings.saveErrorDescription', "Could not save installment settings."),
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [user]);

  return {
    settings,
    loading,
    updateSettings,
    refetch: fetchSettings
  };
};