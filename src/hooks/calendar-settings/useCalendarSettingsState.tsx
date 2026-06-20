
import { useState, useEffect, useCallback } from 'react';
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

  // Buffer-only: edits accumulate in pendingChanges and are NOT persisted until the user
  // explicitly clicks Save (the SettingsSaveBar in CalendarSettings calls saveAllChanges).
  // This makes Operations consistent with UserManagement/AIKnowledgeTab (B3); the old 1s
  // debounced auto-save was the only settings surface that saved silently per-field.
  const updatePendingSettings = useCallback((updates: Partial<CalendarSettings>) => {
    setPendingChanges(prev => ({ ...prev, ...updates }));
  }, []);

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
