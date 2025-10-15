import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { WaitlistEntry } from '@/types/waitlist';

export const useWaitlist = (calendarId?: string) => {
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchWaitlistEntries = async () => {
    if (!calendarId) return;

    try {
      const { data, error } = await supabase
        .from('waitlist')
        .select('*')
        .eq('calendar_id', calendarId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Cast the data to ensure proper typing
      const typedData = (data || []).map(entry => ({
        ...entry,
        flexibility: entry.flexibility as 'specific' | 'morning' | 'afternoon' | 'anytime',
        status: entry.status as 'waiting' | 'notified' | 'converted' | 'expired'
      }));
      
      setWaitlistEntries(typedData);
    } catch (error) {
      console.error('Error fetching waitlist entries:', error);
      toast({
        title: "Error loading waitlist",
        description: "Could not load waitlist",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addToWaitlist = async (
    calendarSlug: string,
    serviceTypeId: string,
    customerName: string,
    customerEmail: string,
    preferredDate: Date,
    preferredTimeStart?: string,
    preferredTimeEnd?: string,
    flexibility: string = 'anytime'
  ) => {
    try {
      const { data, error } = await supabase.rpc('add_to_waitlist', {
        p_calendar_slug: calendarSlug,
        p_service_type_id: serviceTypeId,
        p_customer_name: customerName,
        p_customer_email: customerEmail,
        p_preferred_date: preferredDate.toISOString().split('T')[0],
        p_preferred_time_start: preferredTimeStart || null,
        p_preferred_time_end: preferredTimeEnd || null,
        p_flexibility: flexibility
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; waitlist_id?: string };

      if (!result.success) {
        toast({
          title: "Error adding to waitlist",
          description: result.error || "Unknown error",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Added to waitlist",
        description: "You have been successfully added to the waitlist. You'll be notified when a spot opens up.",
      });

      await fetchWaitlistEntries();
      return true;
    } catch (error) {
      console.error('Error adding to waitlist:', error);
      toast({
        title: "Error adding to waitlist",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  };

  const removeFromWaitlist = async (waitlistId: string) => {
    try {
      const { error } = await supabase
        .from('waitlist')
        .delete()
        .eq('id', waitlistId);

      if (error) throw error;

      toast({
        title: "Removed from waitlist",
        description: "The waitlist entry has been removed",
      });

      await fetchWaitlistEntries();
    } catch (error) {
      console.error('Error removing from waitlist:', error);
      toast({
        title: "Error deleting",
        description: "Could not remove from waitlist",
        variant: "destructive",
      });
    }
  };

  const updateWaitlistStatus = async (waitlistId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('waitlist')
        .update({ status, notified_at: status === 'notified' ? new Date().toISOString() : null })
        .eq('id', waitlistId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: "Waitlist status has been updated",
      });

      await fetchWaitlistEntries();
    } catch (error) {
      console.error('Error updating waitlist status:', error);
      toast({
        title: "Error updating",
        description: "Could not update status",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchWaitlistEntries();
  }, [calendarId]);

  return {
    waitlistEntries,
    loading,
    addToWaitlist,
    removeFromWaitlist,
    updateWaitlistStatus,
    refetch: fetchWaitlistEntries
  };
};
