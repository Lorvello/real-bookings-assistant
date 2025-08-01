import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SubscriptionTier } from '@/types/database';

export const useAdminControls = () => {
  const [isLoading, setIsLoading] = useState(false);
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
          title: "Success",
          description: result.message || "User subscription updated successfully",
        });
        return result.user;
      } else {
        throw new Error(result.error || "Failed to update user subscription");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user subscription",
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
          title: "Success",
          description: result.message || "Trial extended successfully",
        });
        return result;
      } else {
        throw new Error(result.error || "Failed to extend trial");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to extend trial",
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
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get user details",
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
    isLoading,
  };
};