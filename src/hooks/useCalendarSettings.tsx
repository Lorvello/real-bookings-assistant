
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CalendarSettings } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export const useCalendarSettings = (calendarId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<CalendarSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && calendarId) {
      fetchSettings();
    } else {
      setSettings(null);
      setLoading(false);
    }
  }, [user, calendarId]);

  const fetchSettings = async () => {
    if (!calendarId) return;

    try {
      const { data, error } = await supabase
        .from('calendar_settings')
        .select('*')
        .eq('calendar_id', calendarId)
        .single();

      if (error) {
        console.error('Error fetching calendar settings:', error);
        return;
      }

      setSettings(data);
    } catch (error) {
      console.error('Error fetching calendar settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<CalendarSettings>) => {
    if (!calendarId || !settings) return;

    try {
      const { error } = await supabase
        .from('calendar_settings')
        .update(updates)
        .eq('calendar_id', calendarId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update calendar settings",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Calendar settings updated successfully",
      });

      await fetchSettings();
    } catch (error) {
      console.error('Error updating calendar settings:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return {
    settings,
    loading,
    updateSettings,
    refetch: fetchSettings
  };
};
