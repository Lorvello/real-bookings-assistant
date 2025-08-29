import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getStripeMode, getStripePublishableKey } from '@/utils/stripeConfig';

interface AccountSessionData {
  client_secret: string;
  account_id: string;
  components: string[];
  expires_at: number;
  session_id: string;
}

interface UseStripeAccountSessionOptions {
  components: string[];
  autoRefresh?: boolean;
  refreshBuffer?: number; // Minutes before expiry to refresh
}

export const useStripeAccountSession = (options: UseStripeAccountSessionOptions) => {
  const { components, autoRefresh = true, refreshBuffer = 5 } = options;
  const [sessionData, setSessionData] = useState<AccountSessionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const createAccountSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-account-session', {
        body: { 
          components,
          test_mode: getStripeMode() === 'test'
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to create account session');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to create account session');
      }

      setSessionData(data);
      console.log('Account session created:', data.session_id);
      
    } catch (err) {
      console.error('Failed to create account session:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      toast({
        title: "Error",
        description: "Failed to initialize Stripe components",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [components, toast]);

  const refreshSession = useCallback(async () => {
    if (!sessionData) return;
    
    console.log('Refreshing account session...');
    await createAccountSession();
  }, [createAccountSession, sessionData]);

  // Check if session needs refresh
  const needsRefresh = useCallback(() => {
    if (!sessionData) return true;
    
    const now = Math.floor(Date.now() / 1000);
    const refreshThreshold = sessionData.expires_at - (refreshBuffer * 60);
    
    return now >= refreshThreshold;
  }, [sessionData, refreshBuffer]);

  // Auto-refresh logic
  useEffect(() => {
    if (!autoRefresh || !sessionData) return;

    const checkAndRefresh = () => {
      if (needsRefresh()) {
        refreshSession();
      }
    };

    // Check every minute
    const interval = setInterval(checkAndRefresh, 60000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, sessionData, needsRefresh, refreshSession]);

  // Initial session creation
  useEffect(() => {
    createAccountSession();
  }, [createAccountSession]);

  return {
    sessionData,
    loading,
    error,
    refreshSession,
    needsRefresh: needsRefresh(),
    isExpired: sessionData ? Math.floor(Date.now() / 1000) >= sessionData.expires_at : false
  };
};