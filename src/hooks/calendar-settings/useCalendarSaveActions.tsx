
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { updateCalendarSettings } from './calendarSettingsUtils';
import { CalendarSettings } from '@/types/database';

export const useCalendarSaveActions = (
  calendarId?: string,
  settings?: CalendarSettings | null,
  pendingChanges?: Partial<CalendarSettings>,
  hasPendingChanges?: boolean,
  setSaving?: (saving: boolean) => void,
  setPendingChanges?: (changes: Partial<CalendarSettings>) => void,
  fetchSettings?: () => void
) => {
  const { toast } = useToast();
  const { t } = useTranslation('notifications');

  const saveAllChanges = async (): Promise<boolean> => {
    if (!calendarId || !settings || !hasPendingChanges || !pendingChanges) {
      console.log('Cannot save: missing requirements', { 
        calendarId, 
        settings: !!settings, 
        hasPendingChanges 
      });
      return false;
    }

    setSaving?.(true);
    try {
      const success = await updateCalendarSettings(calendarId, pendingChanges);

      if (!success) {
        toast({
          title: t('calendarSaveActions.errorTitle', 'Error'),
          description: t('calendarSaveActions.settingsSaveFailedDescription', 'Cannot save calendar settings'),
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: t('calendarSaveActions.successTitle', 'Success'),
        description: t('calendarSaveActions.settingsSavedDescription', 'Calendar settings saved successfully'),
      });

      setPendingChanges?.({});
      fetchSettings?.();
      return true;
    } catch (error) {
      console.error('Error saving calendar settings:', error);
      toast({
        title: t('calendarSaveActions.errorTitle', 'Error'),
        description: t('calendarSaveActions.unexpectedErrorDescription', 'An unexpected error occurred'),
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving?.(false);
    }
  };

  return {
    saveAllChanges
  };
};
