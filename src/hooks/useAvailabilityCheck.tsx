
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAvailabilityCheck = () => {
  const [loading, setLoading] = useState(false);

  const checkAvailability = async (
    calendarId: string,
    datetime: string,
    durationMinutes: number = 30
  ): Promise<boolean> => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.rpc('check_availability', {
        p_calendar_id: calendarId,
        p_datetime: datetime,
        p_duration_minutes: durationMinutes
      });

      if (error) {
        console.error('Error checking availability:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Error checking availability:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const checkMultipleSlots = async (
    calendarId: string,
    datetimes: string[],
    durationMinutes: number = 30
  ): Promise<{ [datetime: string]: boolean }> => {
    setLoading(true);
    
    try {
      const results = await Promise.all(
        datetimes.map(async (datetime) => {
          const isAvailable = await checkAvailability(calendarId, datetime, durationMinutes);
          return { datetime, isAvailable };
        })
      );

      const availabilityMap: { [datetime: string]: boolean } = {};
      results.forEach(({ datetime, isAvailable }) => {
        availabilityMap[datetime] = isAvailable;
      });

      return availabilityMap;
    } catch (error) {
      console.error('Error checking multiple slots:', error);
      return {};
    } finally {
      setLoading(false);
    }
  };

  const getDetailedSlots = async (
    calendarId: string,
    serviceTypeId: string,
    date: string,
    timezone: string = 'Europe/Amsterdam'
  ) => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.rpc('get_available_slots', {
        p_calendar_id: calendarId,
        p_service_type_id: serviceTypeId,
        p_date: date,
        p_timezone: timezone
      });

      if (error) {
        console.error('Error getting detailed slots:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting detailed slots:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    checkAvailability,
    checkMultipleSlots,
    getDetailedSlots,
    loading
  };
};
