
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useBusinessOverviewRefresh = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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
          title: "Fout bij verversen overzicht",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Overzicht ververst",
          description: "Het bedrijfsoverzicht is succesvol ververst",
        });
      }
    } catch (error) {
      console.error('Error refreshing overview:', error);
      toast({
        title: "Fout bij verversen overzicht",
        description: "Er is een onverwachte fout opgetreden",
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
