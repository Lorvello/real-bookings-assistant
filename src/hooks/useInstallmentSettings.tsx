import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { isTestMode } from '@/utils/stripeConfig';

export interface InstallmentPlan {
  type: 'preset' | 'custom';
  preset?: '100_at_booking' | '50_50' | 'fixed_deposit';
  deposits?: Array<{
    percentage?: number;
    amount?: number;
    timing: 'now' | 'appointment';
  }>;
  fixed_deposit_amount?: number;
}

export interface InstallmentServiceConfig {
  serviceTypeId: string;
  enabled: boolean;
  plan: InstallmentPlan;
  allowCustomerChoice: boolean;
}

export interface InstallmentSettings {
  enabled: boolean;
  allowCustomerChoice: boolean;
  defaultPlan: InstallmentPlan;
  applyToServices: 'all' | 'selected';
  selectedServices: string[];
  serviceConfigs: InstallmentServiceConfig[];
}

export const DEFAULT_INSTALLMENT_SETTINGS: InstallmentSettings = {
  enabled: false,
  // Reserved compatibility field. Customer choice is not implemented consistently
  // across booking channels, so the canonical value must remain fail-closed.
  allowCustomerChoice: false,
  defaultPlan: {
    type: 'preset',
    preset: '50_50',
  },
  applyToServices: 'all',
  selectedServices: [],
  serviceConfigs: [],
};

export const useInstallmentSettings = () => {
  const [settings, setSettings] = useState<InstallmentSettings | null>(null);
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation('notifications');
  const currentUserId = user?.id ?? null;
  const currentUserIdRef = useRef<string | null>(currentUserId);
  const requestGenerationRef = useRef(0);
  currentUserIdRef.current = currentUserId;

  const fetchSettings = useCallback(async () => {
    const requestedUserId = currentUserId;
    const requestGeneration = ++requestGenerationRef.current;

    setSettings(null);
    setLoadedForUserId(null);
    if (!requestedUserId) {
      setLoadFailed(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadFailed(false);
    try {
      const { data, error } = await supabase.functions.invoke(
        'manage-installment-settings',
        { body: { action: 'read' } },
      );

      if (error) throw error;
      if (!data?.success || !data?.settings) {
        throw new Error('Invalid installment settings response');
      }

      if (
        requestGenerationRef.current !== requestGeneration ||
        currentUserIdRef.current !== requestedUserId
      ) return;
      setSettings(data.settings as InstallmentSettings);
      setLoadedForUserId(requestedUserId);
    } catch (error) {
      if (
        requestGenerationRef.current !== requestGeneration ||
        currentUserIdRef.current !== requestedUserId
      ) return;
      setSettings(null);
      setLoadedForUserId(null);
      setLoadFailed(true);
      console.error('Error fetching installment settings:', error);
      toast({
        title: t('installmentSettings.loadErrorTitle', "Error loading settings"),
        description: t('installmentSettings.loadErrorDescription', "Could not load installment settings."),
        variant: "destructive"
      });
    } finally {
      if (
        requestGenerationRef.current === requestGeneration &&
        currentUserIdRef.current === requestedUserId
      ) setLoading(false);
    }
  }, [currentUserId, t, toast]);

  const authoritativeSettings = loadedForUserId === currentUserId
    ? settings
    : null;

  const updateSettings = async (settingsData: Partial<InstallmentSettings>) => {
    if (!user) return false;
    const saveUserId = user.id;
    if (loading || loadFailed || authoritativeSettings === null) {
      toast({
        title: t('installmentSettings.loadErrorTitle', "Error loading settings"),
        description: t(
          'installmentSettings.saveBlockedUntilLoaded',
          "Reload the authoritative installment settings before saving changes.",
        ),
        variant: "destructive",
      });
      return false;
    }

    try {
      // Merge only with the authoritative snapshot. Defaults are display-only and
      // must never become a mutation payload after a failed or unfinished read.
      const mergedSettings: InstallmentSettings = {
        ...authoritativeSettings,
        ...settingsData
      };

      const { data, error } = await supabase.functions.invoke('manage-installment-settings', {
        body: {
          action: 'save',
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
          const context = (error as { context?: Response }).context;
          const body = context
            ? await context.json() as { error?: string }
            : null;
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

      if (!data.settings) {
        throw new Error('Saved installment settings were not returned');
      }
      if (currentUserIdRef.current !== saveUserId) return false;
      setSettings(data.settings as InstallmentSettings);
      setLoadedForUserId(saveUserId);
      toast({
        title: t('installmentSettings.saveSuccessTitle', "Settings saved"),
        description: t('installmentSettings.saveSuccessDescription', "Installment settings have been updated successfully."),
      });
      return true;
    } catch (error) {
      if (currentUserIdRef.current !== saveUserId) return false;
      console.error('Error updating installment settings:', error);
      const message = error instanceof Error
        ? error.message
        : t('installmentSettings.saveErrorDescription', "Could not save installment settings.");
      toast({
        title: t('installmentSettings.saveErrorTitle', "Error saving settings"),
        description: message,
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  return {
    settings: authoritativeSettings,
    loading,
    loadFailed,
    ready: !loading && !loadFailed && authoritativeSettings !== null,
    updateSettings,
    refetch: fetchSettings
  };
};
