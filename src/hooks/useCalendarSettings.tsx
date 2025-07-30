
import { useCalendarSettingsState } from './calendar-settings/useCalendarSettingsState';
import { useCalendarManagement } from './useCalendarManagement';

export const useCalendarSettings = (calendarId?: string) => {
  const {
    settings,
    pendingChanges,
    loading,
    saving,
    setSaving,
    hasPendingChanges,
    updatePendingSettings,
    fetchSettings,
    setPendingChanges
  } = useCalendarSettingsState(calendarId);

  const { updateName, updateSettings } = useCalendarManagement();

  const updateCalendarName = async (newName: string) => {
    if (!calendarId) return false;
    return await updateName(calendarId, newName);
  };

  const saveAllChanges = async (): Promise<boolean> => {
    if (!calendarId || !settings || !hasPendingChanges || !pendingChanges) {
      return false;
    }

    setSaving(true);
    try {
      const success = await updateSettings(calendarId, pendingChanges);
      if (success) {
        setPendingChanges({});
        fetchSettings();
      }
      return success;
    } catch (error) {
      console.error('Error saving changes:', error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    settings,
    loading,
    saving,
    hasPendingChanges,
    updatePendingSettings,
    updateCalendarName,
    saveAllChanges,
    refetch: fetchSettings
  };
};
