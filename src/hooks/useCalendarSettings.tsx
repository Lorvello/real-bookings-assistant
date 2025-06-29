
import { useCalendarSettingsState } from './calendar-settings/useCalendarSettingsState';
import { useCalendarNameActions } from './calendar-settings/useCalendarNameActions';
import { useCalendarSaveActions } from './calendar-settings/useCalendarSaveActions';

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

  const { updateCalendarName } = useCalendarNameActions(calendarId);

  const { saveAllChanges } = useCalendarSaveActions(
    calendarId,
    settings,
    pendingChanges,
    hasPendingChanges,
    setSaving,
    setPendingChanges,
    fetchSettings
  );

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
