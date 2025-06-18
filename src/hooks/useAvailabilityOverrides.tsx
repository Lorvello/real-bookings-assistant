
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AvailabilityOverride } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export const useAvailabilityOverrides = (calendarId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && calendarId) {
      fetchOverrides();
    } else {
      setOverrides([]);
      setLoading(false);
    }
  }, [user, calendarId]);

  const fetchOverrides = async () => {
    if (!calendarId) return;

    try {
      const { data, error } = await supabase
        .from('availability_overrides')
        .select('*')
        .eq('calendar_id', calendarId)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching availability overrides:', error);
        return;
      }

      setOverrides(data || []);
    } catch (error) {
      console.error('Error fetching availability overrides:', error);
    } finally {
      setLoading(false);
    }
  };

  const createOverride = async (overrideData: Partial<AvailabilityOverride>) => {
    if (!calendarId) return;

    // Ensure required fields are present
    if (!overrideData.date) {
      toast({
        title: "Error",
        description: "Date is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('availability_overrides')
        .insert({
          calendar_id: calendarId,
          date: overrideData.date,
          is_available: overrideData.is_available ?? false,
          start_time: overrideData.start_time,
          end_time: overrideData.end_time,
          reason: overrideData.reason
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create availability override",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Availability override created successfully",
      });

      await fetchOverrides();
    } catch (error) {
      console.error('Error creating availability override:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const updateOverride = async (id: string, updates: Partial<AvailabilityOverride>) => {
    try {
      const { error } = await supabase
        .from('availability_overrides')
        .update(updates)
        .eq('id', id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update availability override",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Availability override updated successfully",
      });

      await fetchOverrides();
    } catch (error) {
      console.error('Error updating availability override:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const deleteOverride = async (id: string) => {
    try {
      const { error } = await supabase
        .from('availability_overrides')
        .delete()
        .eq('id', id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete availability override",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Availability override deleted successfully",
      });

      await fetchOverrides();
    } catch (error) {
      console.error('Error deleting availability override:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return {
    overrides,
    loading,
    createOverride,
    updateOverride,
    deleteOverride,
    refetch: fetchOverrides
  };
};
