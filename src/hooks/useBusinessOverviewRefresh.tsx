
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useBusinessOverviewRefresh = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const refreshOverview = async (calendarId?: string) => {
    setLoading(true);
    try {
      if (calendarId) {
        // Refresh specific calendar
        const { error } = await supabase.rpc('refresh_business_overview', {
          p_calendar_id: calendarId
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
      } else {
        // If no specific calendar, just show success - data will be fetched by the component
        toast({
          title: "Overzicht verversen",
          description: "Het overzicht wordt bijgewerkt...",
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
