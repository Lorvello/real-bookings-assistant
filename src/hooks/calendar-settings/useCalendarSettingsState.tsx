
import { useState, useEffect, useCallback, useRef } from 'react';
import { CalendarSettings } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';
import { fetchCalendarSettings, createDefaultCalendarSettings, updateCalendarSettings } from './calendarSettingsUtils';
import { useToast } from '@/hooks/use-toast';

export const useCalendarSettingsState = (calendarId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<CalendarSettings | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Partial<CalendarSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

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

  // Auto-save function with debounce
  const autoSave = useCallback(async (changes: Partial<CalendarSettings>) => {
    if (!calendarId || !changes || Object.keys(changes).length === 0) return;

    setSaving(true);
    try {
      const success = await updateCalendarSettings(calendarId, changes);
      
      if (success) {
        // Clear pending changes after successful save
        setPendingChanges({});
        // Update the current settings with the saved changes
        setSettings(prev => prev ? { ...prev, ...changes } : null);
      } else {
        toast({
          title: "Error",
          description: "Cannot save calendar settings",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Auto-save error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while saving",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [calendarId, toast]);

  const updatePendingSettings = useCallback((updates: Partial<CalendarSettings>) => {
    console.log('Updating pending settings:', updates);
    setPendingChanges(prev => {
      const newChanges = { ...prev, ...updates };
      
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Set new timeout for auto-save
      autoSaveTimeoutRef.current = setTimeout(() => {
        autoSave(newChanges);
      }, 1000); // 1 second debounce
      
      return newChanges;
    });
  }, [autoSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
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
