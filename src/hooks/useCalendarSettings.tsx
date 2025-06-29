
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CalendarSettings } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { useCalendarContext } from '@/contexts/CalendarContext';

export const useCalendarSettings = (calendarId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { refetchCalendars } = useCalendarContext();
  const [settings, setSettings] = useState<CalendarSettings | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Partial<CalendarSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

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
      setLoading(true);
      console.log('Fetching calendar settings for:', calendarId);

      const { data, error } = await supabase
        .from('calendar_settings')
        .select('*')
        .eq('calendar_id', calendarId)
        .single();

      if (error) {
        // If no settings exist, create default ones
        if (error.code === 'PGRST116') {
          console.log('No settings found, creating default settings...');
          await createDefaultSettings();
        } else {
          console.error('Error fetching calendar settings:', error);
        }
        return;
      }

      console.log('Calendar settings loaded:', data);
      setSettings(data);
      setPendingChanges({});
    } catch (error) {
      console.error('Error fetching calendar settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSettings = async () => {
    if (!calendarId || !user) return;

    try {
      const defaultSettings = {
        calendar_id: calendarId,
        user_id: user.id,
        confirmation_required: true,
        allow_waitlist: false,
        whatsapp_bot_active: false,
        slot_duration: 30,
        buffer_time: 0,
        minimum_notice_hours: 1,
        booking_window_days: 60,
        max_bookings_per_day: null
      };

      const { data, error } = await supabase
        .from('calendar_settings')
        .insert(defaultSettings)
        .select()
        .single();

      if (error) {
        console.error('Error creating default settings:', error);
        return;
      }

      console.log('Default settings created:', data);
      setSettings(data);
      setPendingChanges({});
    } catch (error) {
      console.error('Error creating default settings:', error);
    }
  };

  const updatePendingSettings = (updates: Partial<CalendarSettings>) => {
    console.log('Updating pending settings:', updates);
    setPendingChanges(prev => ({ ...prev, ...updates }));
  };

  const updateCalendarName = async (newName: string) => {
    if (!calendarId) return false;

    setSaving(true);
    try {
      console.log('Updating calendar name to:', newName);

      const { error } = await supabase
        .from('calendars')
        .update({ name: newName })
        .eq('id', calendarId);

      if (error) {
        console.error('Error updating calendar name:', error);
        toast({
          title: "Fout",
          description: "Kan kalendernaam niet bijwerken",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Succes",
        description: "Kalendernaam succesvol bijgewerkt",
      });

      // Refresh calendars to update the context
      await refetchCalendars();
      return true;
    } catch (error) {
      console.error('Error updating calendar name:', error);
      toast({
        title: "Fout",
        description: "Er is een onverwachte fout opgetreden",
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveAllChanges = async () => {
    if (!calendarId || !settings || !hasPendingChanges) {
      console.log('Cannot save: missing requirements', { calendarId, settings: !!settings, hasPendingChanges });
      return false;
    }

    setSaving(true);
    try {
      console.log('Saving calendar settings changes:', pendingChanges);

      const { error } = await supabase
        .from('calendar_settings')
        .update(pendingChanges)
        .eq('calendar_id', calendarId);

      if (error) {
        console.error('Error saving calendar settings:', error);
        toast({
          title: "Fout",
          description: "Kan kalender instellingen niet opslaan",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Succes",
        description: "Kalender instellingen succesvol opgeslagen",
      });

      console.log('Settings saved successfully');
      setPendingChanges({});
      await fetchSettings();
      return true;
    } catch (error) {
      console.error('Error saving calendar settings:', error);
      toast({
        title: "Fout",
        description: "Er is een onverwachte fout opgetreden",
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const getCurrentSettings = () => {
    if (!settings) return null;
    return { ...settings, ...pendingChanges };
  };

  return {
    settings: getCurrentSettings(),
    loading,
    saving,
    hasPendingChanges,
    updatePendingSettings,
    updateCalendarName,
    saveAllChanges,
    refetch: fetchSettings
  };
};
