
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AvailabilitySlot {
  start_time: string;
  end_time: string;
  available: boolean;
}

interface ServiceAvailability {
  date: string;
  service_type_id: string;
  service_name: string;
  duration: number;
  price: number;
  slots: AvailabilitySlot[];
}

interface CalendarAvailabilityResult {
  success: boolean;
  calendar_id?: string;
  availability?: ServiceAvailability[];
  error?: string;
}

export const useCalendarAvailability = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const getAvailability = async (
    calendarSlug: string,
    startDate?: Date,
    days: number = 14
  ): Promise<CalendarAvailabilityResult> => {
    setLoading(true);

    try {
      const formattedStartDate = startDate 
        ? startDate.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      const { data, error } = await supabase.rpc('get_calendar_availability', {
        p_calendar_slug: calendarSlug,
        p_start_date: formattedStartDate,
        p_days: days
      });

      if (error) {
        console.error('Availability error:', error);
        toast({
          title: "Fout bij ophalen beschikbaarheid",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return { success: false, error: error.message };
      }

      if (!data?.success) {
        toast({
          title: "Kalender niet gevonden",
          description: data?.error || "Kalender kon niet worden gevonden",
          variant: "destructive",
        });
        setLoading(false);
        return { success: false, error: data?.error || "Kalender niet gevonden" };
      }

      setLoading(false);
      return {
        success: true,
        calendar_id: data.calendar_id,
        availability: data.availability || []
      };
    } catch (error) {
      console.error('Availability fetch error:', error);
      toast({
        title: "Fout",
        description: "Er is een onverwachte fout opgetreden",
        variant: "destructive",
      });
      setLoading(false);
      return { success: false, error: "Onverwachte fout" };
    }
  };

  return {
    getAvailability,
    loading
  };
};
