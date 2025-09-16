import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getStripeConfig } from '@/utils/stripeConfig';

interface ActivationResult {
  success: boolean;
  activated_count?: number;
  error_count?: number;
  calendars?: Array<{
    calendar_id: string;
    calendar_name: string;
    status: string;
    error?: string;
  }>;
  stripe_sync?: any;
  error?: string;
  action_required?: string;
}

export const usePayAndBookActivation = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const activatePayAndBook = async (calendarId?: string): Promise<ActivationResult> => {
    setLoading(true);
    
    try {
      const stripeConfig = getStripeConfig();
      
      const { data, error } = await supabase.functions.invoke('activate-pay-and-book', {
        body: {
          calendar_id: calendarId,
          test_mode: stripeConfig.testMode
        }
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Activation failed');
      }

      toast({
        title: "Pay & Book Activated",
        description: `Successfully activated for ${data.activated_count} calendar(s)`,
      });

      return data;
    } catch (error: any) {
      console.error('Error activating Pay & Book:', error);
      
      let errorMessage = error.message || 'Failed to activate Pay & Book';
      let actionRequired = null;

      if (error.message?.includes('Stripe account')) {
        errorMessage = 'Please complete Stripe onboarding first';
        actionRequired = 'stripe_onboarding';
      }

      toast({
        title: "Activation Failed",
        description: errorMessage,
        variant: "destructive",
      });

      return { 
        success: false, 
        error: errorMessage,
        action_required: actionRequired
      };
    } finally {
      setLoading(false);
    }
  };

  const syncServicePrices = async (serviceTypeId?: string, forceRecreate = false) => {
    setLoading(true);
    
    try {
      const stripeConfig = getStripeConfig();
      
      const { data, error } = await supabase.functions.invoke('sync-service-stripe-prices', {
        body: {
          service_type_id: serviceTypeId,
          test_mode: stripeConfig.testMode,
          force_recreate: forceRecreate
        }
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Price sync failed');
      }

      toast({
        title: "Prices Synced",
        description: `Successfully synced ${data.synced_count} service(s) with Stripe`,
      });

      return data;
    } catch (error: any) {
      console.error('Error syncing service prices:', error);
      toast({
        title: "Sync Failed",
        description: error.message || 'Failed to sync service prices',
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    activatePayAndBook,
    syncServicePrices
  };
};