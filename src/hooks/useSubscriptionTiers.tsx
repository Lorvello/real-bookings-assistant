import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionTierConfig } from '@/types/database';

export const useSubscriptionTiers = () => {
  const { data: tiers, isLoading, error } = useQuery({
    queryKey: ['subscription-tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_tiers')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      return data as SubscriptionTierConfig[];
    },
  });

  return { tiers, isLoading, error };
};