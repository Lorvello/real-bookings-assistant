
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && calendarId) {
      fetchSchedules();
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    } else {
      setSchedules([]);
      setLoading(false);
    }
  }, [user, calendarId]);

  const fetchSchedules = async () => {
    if (!calendarId) return;

    try {
      setError(null);
      const { data, error } = await supabase
        .from('availability_schedules')
        .select('*')
        .eq('calendar_id', calendarId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching availability schedules:', error);
        setError(error.message);
        toast({
          title: "Error",
          description: "Failed to load availability schedules",
          variant: "destructive",
        });
        return;
      }

      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching availability schedules:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!calendarId) return () => {};

    // Create a unique channel name to prevent conflicts between multiple hook instances
    const channelName = `availability_schedules_${calendarId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'availability_schedules',
          filter: `calendar_id=eq.${calendarId}`
        },
        (payload) => {
          console.log('Availability schedule realtime update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setSchedules(prev => [...prev, payload.new as AvailabilitySchedule]);
          } else if (payload.eventType === 'UPDATE') {
            setSchedules(prev => prev.map(schedule => 
              schedule.id === payload.new.id ? payload.new as AvailabilitySchedule : schedule
            ));
          } else if (payload.eventType === 'DELETE') {
            setSchedules(prev => prev.filter(schedule => schedule.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const createSchedule = async (scheduleData: Partial<AvailabilitySchedule>) => {
    if (!calendarId) return null;

    try {
      setError(null);
      const { data, error } = await supabase
        .from('availability_schedules')
        .insert({
          calendar_id: calendarId,
          name: scheduleData.name || 'Nieuw Schema',
          is_default: scheduleData.is_default ?? false
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating schedule:', error);
        setError(error.message);
        toast({
          title: "Error",
          description: "Failed to create availability schedule",
          variant: "destructive",
        });
        return null;
      }

      toast({
        title: "Success",
        description: "Availability schedule created successfully",
      });

      return data;
    } catch (error) {
      console.error('Error creating availability schedule:', error);
      setError('An unexpected error occurred');
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateSchedule = async (id: string, updates: Partial<AvailabilitySchedule>) => {
    try {
      setError(null);
      const { error } = await supabase
        .from('availability_schedules')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Error updating schedule:', error);
        setError(error.message);
        toast({
          title: "Error",
          description: "Failed to update availability schedule",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Availability schedule updated successfully",
      });

      return true;
    } catch (error) {
      console.error('Error updating availability schedule:', error);
      setError('An unexpected error occurred');
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteSchedule = async (id: string) => {
    try {
      setError(null);
      const { error } = await supabase
        .from('availability_schedules')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting schedule:', error);
        setError(error.message);
        toast({
          title: "Error",
          description: "Failed to delete availability schedule",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Availability schedule deleted successfully",
      });

      return true;
    } catch (error) {
      console.error('Error deleting availability schedule:', error);
      setError('An unexpected error occurred');
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    schedules,
    loading,
    error,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    refetch: fetchSchedules
  };
};
