import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { useCalendarContext } from '@/contexts/CalendarContext';
import {
  updateCalendarInfo,
  updateServiceTypesCalendarLink,
  updateCalendarMembers
} from './calendarSettingsUtils';

export const useCalendarActions = () => {
  const { toast } = useToast();
  const { t } = useTranslation('notifications');
  const { refreshCalendars } = useCalendarContext();

  const updateFullCalendar = async (calendarId: string, updates: {
    name?: string;
    description?: string;
    color?: string;
    serviceTypeIds?: string[];
    memberUserIds?: string[];
  }): Promise<boolean> => {
    try {
      let allSuccess = true;
      const errors: string[] = [];

      // Update basic calendar info (name, description, color)
      if (updates.name !== undefined || updates.description !== undefined || updates.color !== undefined) {
        const calendarInfoUpdates: { name?: string; description?: string; color?: string } = {};
        if (updates.name !== undefined) calendarInfoUpdates.name = updates.name;
        if (updates.description !== undefined) calendarInfoUpdates.description = updates.description;
        if (updates.color !== undefined) calendarInfoUpdates.color = updates.color;
        
        const infoSuccess = await updateCalendarInfo(calendarId, calendarInfoUpdates);
        if (!infoSuccess) {
          allSuccess = false;
          errors.push('calendar information');
        }
      }

      // Update service types (IUX R55, EDITCALENDAR-SERVICETYPES-DUALTABLE: writes through
      // service_types.calendar_id directly, the app's real source of truth, not the
      // calendar_service_types junction table)
      if (updates.serviceTypeIds !== undefined) {
        const serviceTypesSuccess = await updateServiceTypesCalendarLink(calendarId, updates.serviceTypeIds);
        if (!serviceTypesSuccess) {
          allSuccess = false;
          errors.push('service types');
        }
      }

      // Update team members
      if (updates.memberUserIds !== undefined) {
        const membersSuccess = await updateCalendarMembers(calendarId, updates.memberUserIds);
        if (!membersSuccess) {
          allSuccess = false;
          errors.push('team members');
        }
      }

      if (allSuccess) {
        toast({
          title: t('calendarActions.successTitle', 'Success'),
          description: t('calendarActions.updatedDescription', 'Calendar updated successfully'),
        });

        // Refresh calendars to update the context
        await refreshCalendars();
        return true;
      } else {
        toast({
          title: t('calendarActions.partialUpdateTitle', 'Partial Update'),
          description: t('calendarActions.partialUpdateDescription', 'Calendar updated but failed to update: {{errors}}', { errors: errors.join(', ') }),
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Error updating calendar:', error);
      toast({
        title: t('calendarActions.errorTitle', 'Error'),
        description: t('calendarActions.unexpectedErrorDescription', 'An unexpected error occurred while updating the calendar'),
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    updateFullCalendar
  };
};