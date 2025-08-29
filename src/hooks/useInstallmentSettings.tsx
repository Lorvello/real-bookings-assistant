import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface InstallmentPlan {
  type: 'preset' | 'custom';
  preset?: '50_50' | '25_25_50' | 'fixed_deposit';
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
  defaultPlan: InstallmentPlan;
}

export const useInstallmentSettings = () => {
  const [settings, setSettings] = useState<InstallmentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('installments_enabled, default_installment_plan')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setSettings({
        enabled: data.installments_enabled || false,
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
        title: "Error loading settings",
        description: "Could not load installment settings.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (enabled: boolean, plan: InstallmentPlan) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          installments_enabled: enabled,
          default_installment_plan: plan as any
        })
        .eq('id', user.id);

      if (error) throw error;

      setSettings({ enabled, defaultPlan: plan });
      return true;
    } catch (error) {
      console.error('Error updating installment settings:', error);
      toast({
        title: "Error saving settings",
        description: "Could not save installment settings.",
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