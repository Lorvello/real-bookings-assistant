
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { updateCalendarName } from './calendarSettingsUtils';

export const useCalendarNameActions = (calendarId?: string) => {
  const { toast } = useToast();
  const { t } = useTranslation('notifications');
  const { refreshCalendars } = useCalendarContext();

  const handleUpdateCalendarName = async (newName: string): Promise<boolean> => {
    if (!calendarId) return false;

    try {
      const success = await updateCalendarName(calendarId, newName);

      if (!success) {
        toast({
          title: t('calendarNameActions.errorTitle', 'Error'),
          description: t('calendarNameActions.nameUpdateFailedDescription', 'Cannot update calendar name'),
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: t('calendarNameActions.successTitle', 'Success'),
        description: t('calendarNameActions.nameUpdatedDescription', 'Calendar name updated successfully'),
      });

      // Refresh calendars to update the context
      await refreshCalendars();
      return true;
    } catch (error) {
      console.error('Error updating calendar name:', error);
      toast({
        title: t('calendarNameActions.errorTitle', 'Error'),
        description: t('calendarNameActions.unexpectedErrorDescription', 'An unexpected error occurred'),
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    updateCalendarName: handleUpdateCalendarName
  };
};
