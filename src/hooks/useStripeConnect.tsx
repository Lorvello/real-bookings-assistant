import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getStripeMode, getStripeConfig } from '@/utils/stripeConfig';
import { useAccountRole } from '@/hooks/useAccountRole';
import { useAuth } from '@/hooks/useAuth';
import { selectStripeAccountForMode } from '@/types/payments';
import type { BusinessStripeAccount, StripeConnectOnboardingLink } from '@/types/payments';

export const useStripeConnect = () => {
  const [loading, setLoading] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation('notifications');
  const { user } = useAuth();
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
        title: t('stripeConnect.errorTitle', "Error"),
        description: t('stripeConnect.onboardingLinkFailed', "Failed to create Stripe onboarding link"),
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
      
      // Use accountOwnerId if available, otherwise fallback to user.id
      const ownerId = accountOwnerId || user?.id;
      
      if (!ownerId) {
        console.log('[STRIPE CONNECT] No user ID or account owner ID available');
        return null;
      }
      
      console.log('[STRIPE CONNECT] Fetching Stripe account for owner:', ownerId, {
        accountOwnerId,
        userId: user?.id,
        using: ownerId === accountOwnerId ? 'accountOwnerId' : 'user.id fallback'
      });

      // Get the current environment mode
      const currentMode = getStripeMode();

      // BUG-A FIX: read the persisted Connect account scoped ONLY to account_owner_id
      // (RLS keeps this single-tenant, no IDOR), NOT filtered by `environment`.
      // The old code filtered `.eq('environment', getStripeMode())`, so a row stored
      // in (say) 'test' became invisible the moment the frontend ran in 'live' mode,
      // rendering a PERSISTED connection as state='none' ("not connected") on every
      // login and forcing the owner to re-onboard. A persisted row must never be
      // hidden by a frontend mode mismatch; we still PREFER the current-mode row and
      // expose the row's `environment` so the UI can show a precise per-environment
      // state ("connected in test, finish live onboarding") instead of "not connected".
      const { data: rows, error } = await supabase
        .from('business_stripe_accounts')
        .select('*')
        .eq('account_owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const accounts = (rows ?? []) as BusinessStripeAccount[];

      // Pure, unit-tested selection (see selectStripeAccountForMode): prefer the
      // current-mode row, but NEVER hide a persisted row from the other environment.
      const data = selectStripeAccountForMode(accounts, currentMode);

      console.log('[STRIPE CONNECT] Account query result:', {
        found: !!data,
        currentMode,
        environmentMatch: data ? data.environment === currentMode : null,
        accountId: data?.stripe_account_id,
        environment: data?.environment,
        onboarding_completed: data?.onboarding_completed,
        charges_enabled: data?.charges_enabled,
        payouts_enabled: data?.payouts_enabled
      });

      return data;
    } catch (error) {
      console.error('[STRIPE CONNECT] Error fetching Stripe account:', error);
      toast({
        title: t('stripeConnect.errorTitle', "Error"),
        description: t('stripeConnect.loadAccountFailed', "Failed to load Stripe account information"),
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

      // Handle edge function errors
      if (error) {
        // Check if it's a "no account found" error - this is expected, not an error
        if (error.message?.includes('404') || error.message?.includes('No Stripe account')) {
          console.log('[STRIPE CONNECT] No Stripe account found - user needs to onboard');
          return null;
        }
        throw error;
      }
      
      // Handle response indicating no account (edge function returns success: false)
      if (data?.success === false || data?.error) {
        console.log('[STRIPE CONNECT] No account found:', data?.error);
        return null;
      }
      
      return data;
    } catch (error: any) {
      // Don't show toast for "no account found" - it's expected for new users
      if (error?.message?.includes('No Stripe account') || error?.message?.includes('404')) {
        console.log('[STRIPE CONNECT] No Stripe account exists yet');
        return null;
      }
      
      console.error('Error refreshing account status:', error);
      toast({
        title: t('stripeConnect.errorTitle', "Error"),
        description: t('stripeConnect.refreshStatusFailed', "Failed to refresh account status"),
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
      const testMode = getStripeConfig().testMode;
      console.log('[useStripeConnect] Creating login link with test_mode:', testMode);
      
      const { data, error } = await supabase.functions.invoke('stripe-connect-login', {
        body: { test_mode: testMode }
      });

      if (error) {
        console.error('Stripe login link error:', error);
        throw new Error(error.message || 'Failed to create login link');
      }

      if (!data?.url) {
        throw new Error('No login URL received from Stripe');
      }

      console.log('[useStripeConnect] Login link created successfully');
      return data.url;
    } catch (error) {
      console.error('Error creating login link:', error);
      toast({
        title: t('stripeConnect.errorTitle', "Error"),
        description: error.message || t('stripeConnect.dashboardLinkFailed', "Failed to create Stripe dashboard link"),
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
          title: t('stripeConnect.errorTitle', "Error"),
          description: t('stripeConnect.onboardingSessionFailed', "Failed to create onboarding session"),
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
          title: t('stripeConnect.errorTitle', "Error"),
          description: data.error || t('stripeConnect.sessionFailed', "Failed to create session"),
          variant: "destructive",
        });
        return null;
      }
    } catch (error) {
      console.error('Error creating embedded session:', error);
      toast({
        title: t('stripeConnect.errorTitle', "Error"),
        description: t('stripeConnect.unexpectedError', "An unexpected error occurred"),
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
          title: t('stripeConnect.errorTitle', "Error"),
          description: t('stripeConnect.resetAccountFailed', "Failed to reset Stripe account"),
          variant: "destructive",
        });
        return false;
      }

      if (data.success) {
        toast({
          title: t('stripeConnect.successTitle', "Success"),
          description: t('stripeConnect.resetAccountSuccess', "Stripe account reset successfully"),
        });
        return true;
      } else {
        toast({
          title: t('stripeConnect.errorTitle', "Error"),
          description: data.error || t('stripeConnect.resetFailed', "Failed to reset account"),
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Error resetting account:', error);
      toast({
        title: t('stripeConnect.errorTitle', "Error"),
        description: t('stripeConnect.unexpectedError', "An unexpected error occurred"),
        variant: "destructive",
      });
      return false;
    }
  };

  // Create embedded dashboard session
  const createDashboardSession = async (): Promise<{ client_secret: string; account_id: string } | null> => {
    try {
      const testMode = getStripeMode() === 'test';
      
      const { data, error } = await supabase.functions.invoke('stripe-connect-embedded', {
        body: { 
          test_mode: testMode
        }
      });

      if (error) {
        console.error('Error creating dashboard session:', error);
        toast({
          title: t('stripeConnect.errorTitle', "Error"),
          description: t('stripeConnect.dashboardSessionFailed', "Failed to create dashboard session"),
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
          title: t('stripeConnect.errorTitle', "Error"),
          description: data.error || t('stripeConnect.dashboardSessionFailed', "Failed to create dashboard session"),
          variant: "destructive",
        });
        return null;
      }
    } catch (error) {
      console.error('Error creating dashboard session:', error);
      toast({
        title: t('stripeConnect.errorTitle', "Error"),
        description: t('stripeConnect.unexpectedError', "An unexpected error occurred"),
        variant: "destructive",
      });
      return null;
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
    createDashboardSession,
    resetStripeAccount
  };
};