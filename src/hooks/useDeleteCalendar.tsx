import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useDeleteCalendar = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation('notifications');

  const deleteCalendar = async (calendarId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('calendars')
        .delete()
        .eq('id', calendarId);

      if (error) {
        throw error;
      }

      toast({
        title: t('deleteCalendar.deletedTitle', 'Calendar deleted'),
        description: t('deleteCalendar.deletedDescription', 'Calendar has been deleted successfully'),
      });
    } catch (error) {
      console.error('Error deleting calendar:', error);
      toast({
        title: t('deleteCalendar.deleteErrorTitle', 'Error deleting calendar'),
        description: t('deleteCalendar.deleteErrorDescription', 'Could not delete calendar. Please try again.'),
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    deleteCalendar,
    loading,
  };
};