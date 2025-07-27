import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useToast } from '@/hooks/use-toast';

export const useTimezoneManager = () => {
  const { selectedCalendar, refreshCalendars } = useCalendarContext();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const updateTimezone = useCallback(async (newTimezone: string) => {
    if (!selectedCalendar?.id) {
      throw new Error('No calendar selected');
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('calendars')
        .update({ timezone: newTimezone })
        .eq('id', selectedCalendar.id);

      if (error) throw error;

      // Refresh calendar data to sync state
      await refreshCalendars();

      toast({
        title: "Timezone Updated",
        description: `Calendar timezone changed to ${newTimezone}`,
      });

      return true;

    } catch (error) {
      console.error('Error updating timezone:', error);
      
      toast({
        title: "Error",
        description: "Failed to update timezone. Please try again.",
        variant: "destructive",
      });

      throw error;
    } finally {
      setSaving(false);
    }
  }, [selectedCalendar?.id, refreshCalendars, toast]);

  const getCurrentTimezone = useCallback(() => {
    return selectedCalendar?.timezone || 'UTC';
  }, [selectedCalendar?.timezone]);

  const getTimezoneOffset = useCallback((timezone?: string) => {
    const tz = timezone || getCurrentTimezone();
    const now = new Date();
    const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    const target = new Date(utc.toLocaleString('en-US', { timeZone: tz }));
    const offset = (target.getTime() - utc.getTime()) / (1000 * 60 * 60);
    
    return offset >= 0 ? `+${offset}` : `${offset}`;
  }, [getCurrentTimezone]);

  const getCurrentTime = useCallback((timezone?: string) => {
    const tz = timezone || getCurrentTimezone();
    return new Date().toLocaleTimeString('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [getCurrentTimezone]);

  return {
    currentTimezone: getCurrentTimezone(),
    saving,
    updateTimezone,
    getCurrentTime,
    getTimezoneOffset,
  };
};