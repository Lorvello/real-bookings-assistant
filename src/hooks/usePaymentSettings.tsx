import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { PaymentSettings } from '@/types/payments';

export const usePaymentSettings = (calendarId?: string) => {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

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
        setSettings({
          ...data,
          enabled_payment_methods: Array.isArray(data.enabled_payment_methods) 
            ? data.enabled_payment_methods as string[]
            : ['ideal'],
          payout_option: (data.payout_option as 'standard' | 'instant') || 'standard'
        });
      }
    } catch (error) {
      console.error('Error fetching payment settings:', error);
      toast({
        title: "Error",
        description: "Failed to load payment settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<PaymentSettings>) => {
    if (!calendarId) return false;

    try {
      setSaving(true);
      
      // If no settings exist, create them
      if (!settings) {
        const { data, error } = await supabase
          .from('payment_settings')
          .insert({
            calendar_id: calendarId,
            ...updates
          })
          .select()
          .single();

        if (error) throw error;
        setSettings({
          ...data,
          enabled_payment_methods: Array.isArray(data.enabled_payment_methods) 
            ? data.enabled_payment_methods as string[]
            : ['ideal'],
          payout_option: (data.payout_option as 'standard' | 'instant') || 'standard'
        });
      } else {
        // Update existing settings
        const { data, error } = await supabase
          .from('payment_settings')
          .update(updates)
          .eq('calendar_id', calendarId)
          .select()
          .single();

        if (error) throw error;
        setSettings({
          ...data,
          enabled_payment_methods: Array.isArray(data.enabled_payment_methods) 
            ? data.enabled_payment_methods as string[]
            : ['ideal'],
          payout_option: (data.payout_option as 'standard' | 'instant') || 'standard'
        });
      }

      toast({
        title: "Success",
        description: "Payment settings updated successfully",
      });

      return true;
    } catch (error) {
      console.error('Error updating payment settings:', error);
      toast({
        title: "Error",
        description: "Failed to update payment settings",
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toggleSecurePayments = async (enabled: boolean) => {
    return await updateSettings({ secure_payments_enabled: enabled });
  };

  const togglePaymentRequired = async (required: boolean) => {
    return await updateSettings({ payment_required_for_booking: required });
  };

  const updatePaymentMethods = async (methods: string[]) => {
    return await updateSettings({ enabled_payment_methods: methods });
  };

  const updatePayoutOption = async (option: 'standard' | 'instant') => {
    return await updateSettings({ payout_option: option });
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
    updatePayoutOption,
    refetch: fetchSettings
  };
};