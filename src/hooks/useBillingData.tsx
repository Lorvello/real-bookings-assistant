import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface BillingData {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
  payment_status: string;
  billing_cycle: string | null;
  next_billing_date: string | null;
  last_payment_date: string | null;
  last_payment_amount: number | null;
}

export const useBillingData = () => {
  const { user } = useAuth();

  const { data: billingData, isLoading, error, refetch } = useQuery({
    queryKey: ['billing-data', user?.id],
    queryFn: async (): Promise<BillingData> => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    billingData,
    isLoading,
    error,
    refetch
  };
};