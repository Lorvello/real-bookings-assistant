
import { useToast } from '@/hooks/use-toast';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { updateCalendarName } from './calendarSettingsUtils';

export const useCalendarNameActions = (calendarId?: string) => {
  const { toast } = useToast();
  const { refreshCalendars } = useCalendarContext();

  const handleUpdateCalendarName = async (newName: string): Promise<boolean> => {
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

      // Refresh calendars to update the context
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

  return {
    updateCalendarName: handleUpdateCalendarName
  };
};
