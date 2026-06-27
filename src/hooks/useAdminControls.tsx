import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SubscriptionTier } from '@/types/database';

export const useAdminControls = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation('notifications');
  const { toast } = useToast();

  const updateUserSubscription = async (
    userId: string,
    updates: {
      subscription_status?: string;
      subscription_tier?: SubscriptionTier;
      trial_end_date?: string;
      subscription_end_date?: string;
      business_name?: string | null;
      business_type?: string | null;
    }
  ) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_update_user_subscription', {
        p_user_id: userId,
        p_subscription_status: updates.subscription_status,
        p_subscription_tier: updates.subscription_tier,
        p_trial_end_date: updates.trial_end_date,
        p_subscription_end_date: updates.subscription_end_date,
        p_business_name: updates.business_name,
        p_business_type: updates.business_type,
      });

      if (error) throw error;

      const result = data as { success: boolean; message?: string; user?: any; error?: string };
      
      if (result.success) {
        toast({
          title: t('adminControls.successTitle', 'Success'),
          description: result.message || t('adminControls.subscriptionUpdatedDescription', 'User subscription updated successfully'),
        });
        return result.user;
      } else {
        throw new Error(result.error || "Failed to update user subscription");
      }
    } catch (error) {
      toast({
        title: t('adminControls.errorTitle', 'Error'),
        description: error instanceof Error ? error.message : t('adminControls.subscriptionUpdateFailedDescription', 'Failed to update user subscription'),
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const extendTrial = async (userId: string, days: number = 30) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_extend_trial', {
        p_user_id: userId,
        p_days: days,
      });

      if (error) throw error;

      const result = data as { success: boolean; message?: string; error?: string };
      
      if (result.success) {
        toast({
          title: t('adminControls.successTitle', 'Success'),
          description: result.message || t('adminControls.trialExtendedDescription', 'Trial extended successfully'),
        });
        return result;
      } else {
        throw new Error(result.error || "Failed to extend trial");
      }
    } catch (error) {
      toast({
        title: t('adminControls.errorTitle', 'Error'),
        description: error instanceof Error ? error.message : t('adminControls.trialExtendFailedDescription', 'Failed to extend trial'),
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getUserSubscriptionDetails = async (userId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_user_subscription_details', {
        p_user_id: userId,
      });

      if (error) throw error;

      const result = data as { success: boolean; user?: any; tier?: any; current_status?: string; days_remaining?: number; error?: string };
      
      if (result.success) {
        return result;
      } else {
        throw new Error(result.error || "Failed to get user details");
      }
    } catch (error) {
      toast({
        title: t('adminControls.errorTitle', 'Error'),
        description: error instanceof Error ? error.message : t('adminControls.getUserDetailsFailedDescription', 'Failed to get user details'),
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const setupMockIncompleteUser = async (userId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_setup_mock_incomplete_user', {
        p_user_id: userId
      });

      if (error) throw error;

      const result = data as { success: boolean; message?: string; error?: string };
      
      if (result.success) {
        toast({
          title: t('adminControls.successTitle', 'Success'),
          description: result.message || t('adminControls.mockUserResetDescription', 'User reset to setup incomplete state'),
        });
        return result;
      } else {
        throw new Error(result.error || "Failed to setup mock incomplete user");
      }
    } catch (error) {
      toast({
        title: t('adminControls.errorTitle', 'Error'),
        description: error instanceof Error ? error.message : t('adminControls.mockUserSetupFailedDescription', 'Failed to setup mock incomplete user'),
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const applyDeveloperStatus = async (
    userId: string,
    status: string,
    tier?: string
  ) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_apply_developer_status', {
        p_user_id: userId,
        p_status: status,
        p_tier: tier,
      });

      if (error) throw error;

      const result = data as { success: boolean; applied_status?: string; tier?: string; error?: string };
      
      if (result.success) {
        toast({
          title: t('adminControls.successTitle', 'Success'),
          description: result.tier
            ? t('adminControls.developerStatusAppliedWithTierDescription', 'Developer status applied: {{status}} with {{tier}} tier', { status: result.applied_status, tier: result.tier })
            : t('adminControls.developerStatusAppliedDescription', 'Developer status applied: {{status}}', { status: result.applied_status }),
        });
        return result;
      } else {
        throw new Error(result.error || "Failed to apply developer status");
      }
    } catch (error) {
      toast({
        title: t('adminControls.errorTitle', 'Error'),
        description: error instanceof Error ? error.message : t('adminControls.developerStatusFailedDescription', 'Failed to apply developer status'),
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    updateUserSubscription,
    extendTrial,
    getUserSubscriptionDetails,
    setupMockIncompleteUser,
    applyDeveloperStatus,
    isLoading,
  };
};