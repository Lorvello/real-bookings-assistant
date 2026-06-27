
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useBusinessOverviewRefresh = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation('notifications');

  const refreshOverview = async (userId?: string) => {
    setLoading(true);
    try {
      // Refresh business overview v2 (one row per business)
      const { error } = await supabase.rpc('refresh_business_overview_v2', {
        p_user_id: userId || null
      });
      
      if (error) {
        console.error('Error refreshing overview:', error);
        toast({
          title: t('businessOverviewRefresh.errorTitle', 'Error refreshing overview'),
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: t('businessOverviewRefresh.successTitle', 'Overview refreshed'),
          description: t('businessOverviewRefresh.successDescription', 'The business overview has been refreshed successfully'),
        });
      }
    } catch (error) {
      console.error('Error refreshing overview:', error);
      toast({
        title: t('businessOverviewRefresh.errorTitle', 'Error refreshing overview'),
        description: t('businessOverviewRefresh.unexpectedError', 'An unexpected error occurred'),
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  return {
    loading,
    refreshOverview
  };
};
