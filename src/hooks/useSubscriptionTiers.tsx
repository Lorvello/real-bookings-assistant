import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionTierConfig } from '@/types/database';

export const useSubscriptionTiers = () => {
  const { data: tiers, isLoading, error } = useQuery({
    queryKey: ['subscription-tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_tiers')
        .select(`
          *,
          stripe_live_monthly_price_id,
          stripe_live_yearly_price_id,
          stripe_test_monthly_price_id,
          stripe_test_yearly_price_id
        `)
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      return data as (SubscriptionTierConfig & {
        stripe_live_monthly_price_id?: string;
        stripe_live_yearly_price_id?: string;
        stripe_test_monthly_price_id?: string;
        stripe_test_yearly_price_id?: string;
      })[];
    },
  });

  return { tiers, isLoading, error };
};