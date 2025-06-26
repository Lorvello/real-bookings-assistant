
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useBusinessOverviewRefresh = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const refreshOverview = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('refresh_business_availability_overview');
      
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
