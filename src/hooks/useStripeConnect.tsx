import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getStripeMode, getStripeConfig } from '@/utils/stripeConfig';
import { useAccountRole } from '@/hooks/useAccountRole';
import type { BusinessStripeAccount, StripeConnectOnboardingLink } from '@/types/payments';

export const useStripeConnect = () => {
  const [loading, setLoading] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const { toast } = useToast();
  const { accountOwnerId } = useAccountRole();

  const createOnboardingLink = async (): Promise<StripeConnectOnboardingLink | null> => {
    try {
      setOnboarding(true);
      
      const { data, error } = await supabase.functions.invoke('stripe-connect-onboard', {
        body: { test_mode: getStripeMode() === 'test' }
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

  const getStripeAccount = async (): Promise<BusinessStripeAccount | null> => {
    try {
      setLoading(true);
      
      if (!accountOwnerId) {
        console.log('[STRIPE CONNECT] No account owner ID available');
        return null;
      }
      
      console.log('[STRIPE CONNECT] Fetching Stripe account for owner:', accountOwnerId);
      
      // Get the current environment mode
      const currentMode = getStripeMode();
      
      // Query for the account with current environment and platform account ID
      const { data, error } = await supabase
        .from('business_stripe_accounts')
        .select('*')
        .eq('account_owner_id', accountOwnerId)
        .eq('environment', currentMode)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      console.log('[STRIPE CONNECT] Account query result:', {
        found: !!data,
        accountId: data?.stripe_account_id,
        environment: data?.environment,
        onboarding_completed: data?.onboarding_completed,
        charges_enabled: data?.charges_enabled,
        payouts_enabled: data?.payouts_enabled
      });
      
      return data as BusinessStripeAccount;
    } catch (error) {
      console.error('[STRIPE CONNECT] Error fetching Stripe account:', error);
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

  const refreshAccountStatus = async (): Promise<BusinessStripeAccount | null> => {
    try {
      setLoading(true);
      const testMode = getStripeMode() === 'test';
      
      const { data, error } = await supabase.functions.invoke('stripe-connect-refresh', {
        body: { 
          test_mode: testMode
        }
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

  const createLoginLink = async (): Promise<string | null> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('stripe-connect-login', {
        body: { 
          test_mode: getStripeConfig().testMode 
        }
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
  const createEmbeddedSession = async (): Promise<{ client_secret: string; account_id: string } | null> => {
    try {
      const testMode = getStripeMode() === 'test';
      
      const { data, error } = await supabase.functions.invoke('stripe-connect-embedded', {
        body: { 
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
  const resetStripeAccount = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-reset', {
        body: { 
          test_mode: getStripeMode() === 'test'
        }
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