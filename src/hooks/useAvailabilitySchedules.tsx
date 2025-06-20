
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AvailabilitySchedule } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export const useAvailabilitySchedules = (calendarId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<AvailabilitySchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && calendarId) {
      fetchSchedules();
    } else {
      setSchedules([]);
      setLoading(false);
    }
  }, [user, calendarId]);

  const fetchSchedules = async () => {
    if (!calendarId) return;

    try {
      const { data, error } = await supabase
        .from('availability_schedules')
        .select('*')
        .eq('calendar_id', calendarId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching availability schedules:', error);
        return;
      }

      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching availability schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSchedule = async (scheduleData: Partial<AvailabilitySchedule>) => {
    if (!calendarId) return;

    try {
      const { error } = await supabase
        .from('availability_schedules')
        .insert({
          calendar_id: calendarId,
          name: scheduleData.name || 'Nieuw Schema',
          is_default: scheduleData.is_default ?? false
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create availability schedule",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Availability schedule created successfully",
      });

      await fetchSchedules();
    } catch (error) {
      console.error('Error creating availability schedule:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const updateSchedule = async (id: string, updates: Partial<AvailabilitySchedule>) => {
    try {
      const { error } = await supabase
        .from('availability_schedules')
        .update(updates)
        .eq('id', id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update availability schedule",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Availability schedule updated successfully",
      });

      await fetchSchedules();
    } catch (error) {
      console.error('Error updating availability schedule:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const deleteSchedule = async (id: string) => {
    try {
      const { error } = await supabase
        .from('availability_schedules')
        .delete()
        .eq('id', id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete availability schedule",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Availability schedule deleted successfully",
      });

      await fetchSchedules();
    } catch (error) {
      console.error('Error deleting availability schedule:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return {
    schedules,
    loading,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    refetch: fetchSchedules
  };
};
