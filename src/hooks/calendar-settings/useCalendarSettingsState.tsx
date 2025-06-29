
import { useState, useEffect } from 'react';
import { CalendarSettings } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';
import { fetchCalendarSettings, createDefaultCalendarSettings } from './calendarSettingsUtils';

export const useCalendarSettingsState = (calendarId?: string) => {
  const { user } = useAuth();
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

      const data = await fetchCalendarSettings(calendarId);
      
      if (!data) {
        // If no settings exist, create default ones
        console.log('No settings found, creating default settings...');
        const defaultSettings = await createDefaultCalendarSettings(calendarId, user?.id);
        if (defaultSettings) {
          setSettings(defaultSettings);
          setPendingChanges({});
        }
      } else {
        console.log('Calendar settings loaded:', data);
        setSettings(data);
        setPendingChanges({});
      }
    } catch (error) {
      console.error('Error fetching calendar settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePendingSettings = (updates: Partial<CalendarSettings>) => {
    console.log('Updating pending settings:', updates);
    setPendingChanges(prev => ({ ...prev, ...updates }));
  };

  const getCurrentSettings = () => {
    if (!settings) return null;
    return { ...settings, ...pendingChanges };
  };

  return {
    settings: getCurrentSettings(),
    pendingChanges,
    loading,
    saving,
    setSaving,
    hasPendingChanges,
    updatePendingSettings,
    fetchSettings,
    setSettings,
    setPendingChanges
  };
};
