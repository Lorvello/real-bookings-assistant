import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getStripeMode } from '@/utils/stripeConfig';
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

  // Create embedded onboarding session
  const createEmbeddedSession = async (calendarId: string): Promise<{ client_secret: string; account_id: string } | null> => {
    try {
      const testMode = getStripeMode() === 'test';
      
      const { data, error } = await supabase.functions.invoke('stripe-connect-embedded', {
        body: { 
          calendar_id: calendarId,
          test_mode: testMode
        }
      });

      if (error) {
        console.error('Error creating embedded session:', error);
        toast({
          title: "Error",
          description: "Failed to create onboarding session",
          variant: "destructive",
        });
        return null;
      }

      if (data.success) {
        return {
          client_secret: data.client_secret,
          account_id: data.account_id
        };
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create session",
          variant: "destructive",
        });
        return null;
      }
    } catch (error) {
      console.error('Error creating embedded session:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return null;
    }
  };

  // Reset Stripe Connect account (for testing)
  const resetStripeAccount = async (calendarId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-reset', {
        body: { calendar_id: calendarId }
      });

      if (error) {
        console.error('Error resetting account:', error);
        toast({
          title: "Error",
          description: "Failed to reset Stripe account",
          variant: "destructive",
        });
        return false;
      }

      if (data.success) {
        toast({
          title: "Success",
          description: "Stripe account reset successfully",
        });
        return true;
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to reset account",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Error resetting account:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    loading,
    onboarding,
    createOnboardingLink,
    getStripeAccount,
    refreshAccountStatus,
    createLoginLink,
    createEmbeddedSession,
    resetStripeAccount
  };
};