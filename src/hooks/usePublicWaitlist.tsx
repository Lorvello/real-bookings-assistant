
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const usePublicWaitlist = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const joinWaitlist = async (
    calendarSlug: string,
    serviceTypeId: string,
    customerName: string,
    customerEmail: string | null, // Now properly nullable
    preferredDate: Date,
    preferredTimeStart?: string,
    preferredTimeEnd?: string,
    flexibility: string = 'anytime'
  ) => {
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('add_to_waitlist', {
        p_calendar_slug: calendarSlug,
        p_service_type_id: serviceTypeId,
        p_customer_name: customerName,
        p_customer_email: customerEmail || null,
        p_preferred_date: preferredDate.toISOString().split('T')[0],
        p_preferred_time_start: preferredTimeStart || null,
        p_preferred_time_end: preferredTimeEnd || null,
        p_flexibility: flexibility
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; waitlist_id?: string };

      if (!result.success) {
        toast({
          title: "Kon niet toevoegen aan wachtlijst",
          description: result.error || "Onbekende fout",
          variant: "destructive",
        });
        setLoading(false);
        return { success: false, error: result.error };
      }

      toast({
        title: "Toegevoegd aan wachtlijst!",
        description: "Je bent succesvol toegevoegd aan de wachtlijst. Je krijgt bericht zodra er een plek vrijkomt.",
      });

      setLoading(false);
      return { success: true, waitlistId: result.waitlist_id };
    } catch (error) {
      console.error('Error joining waitlist:', error);
      toast({
        title: "Fout bij toevoegen aan wachtlijst",
        description: "Er is een onverwachte fout opgetreden",
        variant: "destructive",
      });
      setLoading(false);
      return { success: false, error: 'Onverwachte fout' };
    }
  };

  return {
    joinWaitlist,
    loading
  };
};
