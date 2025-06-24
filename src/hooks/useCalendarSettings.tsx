
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CalendarSettings } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export const useCalendarSettings = (calendarId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
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
      setPendingChanges({});
    } catch (error) {
      console.error('Error fetching calendar settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePendingSettings = (updates: Partial<CalendarSettings>) => {
    setPendingChanges(prev => ({ ...prev, ...updates }));
  };

  const saveAllChanges = async () => {
    if (!calendarId || !settings || !hasPendingChanges) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('calendar_settings')
        .update(pendingChanges)
        .eq('calendar_id', calendarId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to save calendar settings",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Calendar settings saved successfully",
      });

      setPendingChanges({});
      await fetchSettings();
      return true;
    } catch (error) {
      console.error('Error saving calendar settings:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
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
    saveAllChanges,
    refetch: fetchSettings
  };
};
