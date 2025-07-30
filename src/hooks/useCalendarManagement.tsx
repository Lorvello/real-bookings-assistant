import { useToast } from '@/hooks/use-toast';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { updateCalendarName, updateCalendarSettings } from './calendar-settings/calendarSettingsUtils';
import { CalendarSettings } from '@/types/database';

export const useCalendarManagement = () => {
  const { toast } = useToast();
  const { refreshCalendars } = useCalendarContext();

  /**
   * Update calendar name
   */
  const updateName = async (calendarId: string, newName: string): Promise<boolean> => {
    if (!calendarId) return false;

    try {
      const success = await updateCalendarName(calendarId, newName);

      if (!success) {
        toast({
          title: "Error",
          description: "Cannot update calendar name",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Calendar name updated successfully",
      });

      await refreshCalendars();
      return true;
    } catch (error) {
      console.error('Error updating calendar name:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  };

  /**
   * Update calendar settings
   */
  const updateSettings = async (
    calendarId: string, 
    settings: Partial<CalendarSettings>
  ): Promise<boolean> => {
    if (!calendarId || !settings) return false;

    try {
      const success = await updateCalendarSettings(calendarId, settings);

      if (!success) {
        toast({
          title: "Error",
          description: "Cannot save calendar settings",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Calendar settings saved successfully",
      });

      return true;
    } catch (error) {
      console.error('Error saving calendar settings:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    updateName,
    updateSettings,
    refreshCalendars
  };
};