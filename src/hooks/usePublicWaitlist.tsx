
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
          title: "Could not add to waitlist",
          description: result.error || "Unknown error",
          variant: "destructive",
        });
        setLoading(false);
        return { success: false, error: result.error };
      }

      toast({
        title: "Added to waitlist!",
        description: "You have been successfully added to the waitlist. You'll be notified when a spot opens up.",
      });

      setLoading(false);
      return { success: true, waitlistId: result.waitlist_id };
    } catch (error) {
      console.error('Error joining waitlist:', error);
      toast({
        title: "Error adding to waitlist",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      setLoading(false);
      return { success: false, error: 'Unexpected error' };
    }
  };

  return {
    joinWaitlist,
    loading
  };
};
