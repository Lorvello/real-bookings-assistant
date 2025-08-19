import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { BusinessStripeAccount, StripeConnectOnboardingLink } from '@/types/payments';

export const useStripeConnect = () => {
  const [loading, setLoading] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const { toast } = useToast();

  const createOnboardingLink = async (calendarId: string): Promise<StripeConnectOnboardingLink | null> => {
    try {
      setOnboarding(true);
      
      const { data, error } = await supabase.functions.invoke('stripe-connect-onboard', {
        body: { calendar_id: calendarId }
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error creating onboarding link:', error);
      toast({
        title: "Error",
        description: "Failed to create Stripe onboarding link",
        variant: "destructive",
      });
      return null;
    } finally {
      setOnboarding(false);
    }
  };

  const getStripeAccount = async (calendarId: string): Promise<BusinessStripeAccount | null> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('business_stripe_accounts')
        .select('*')
        .eq('calendar_id', calendarId)
        .maybeSingle();

      if (error) throw error;
      return data as BusinessStripeAccount;
    } catch (error) {
      console.error('Error fetching Stripe account:', error);
      toast({
        title: "Error",
        description: "Failed to load Stripe account information",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const refreshAccountStatus = async (calendarId: string): Promise<BusinessStripeAccount | null> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('stripe-connect-refresh', {
        body: { calendar_id: calendarId }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error refreshing account status:', error);
      toast({
        title: "Error",
        description: "Failed to refresh account status",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createLoginLink = async (calendarId: string): Promise<string | null> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('stripe-connect-login', {
        body: { calendar_id: calendarId }
      });

      if (error) throw error;
      return data.url;
    } catch (error) {
      console.error('Error creating login link:', error);
      toast({
        title: "Error",
        description: "Failed to create Stripe dashboard link",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    onboarding,
    createOnboardingLink,
    getStripeAccount,
    refreshAccountStatus,
    createLoginLink
  };
};