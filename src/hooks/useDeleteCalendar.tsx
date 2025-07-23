import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useDeleteCalendar = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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
        title: "Calendar deleted",
        description: "Calendar has been deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting calendar:', error);
      toast({
        title: "Error deleting calendar",
        description: "Could not delete calendar. Please try again.",
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