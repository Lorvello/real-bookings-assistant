
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AvailableSlot {
  slot_start: string;
  slot_end: string;
  is_available: boolean;
}

interface AvailableSlotsRange {
  slot_date: string;
  slot_start: string;
  slot_end: string;
  is_available: boolean;
}

export const useAvailableSlots = () => {
  const [loading, setLoading] = useState(false);

  const getAvailableSlots = async (
    calendarId: string,
    serviceTypeId: string,
    date: string,
    timezone: string = 'Europe/Amsterdam'
  ): Promise<AvailableSlot[]> => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.rpc('get_available_slots', {
        p_calendar_id: calendarId,
        p_service_type_id: serviceTypeId,
        p_date: date,
        p_timezone: timezone
      });

      if (error) {
        console.error('Error fetching available slots:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching available slots:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getAvailableSlotsRange = async (
    calendarId: string,
    serviceTypeId: string,
    startDate: string,
    endDate: string,
    timezone: string = 'Europe/Amsterdam'
  ): Promise<AvailableSlotsRange[]> => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.rpc('get_available_slots_range', {
        p_calendar_id: calendarId,
        p_service_type_id: serviceTypeId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_timezone: timezone
      });

      if (error) {
        console.error('Error fetching available slots range:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching available slots range:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getAvailableSlotsFromView = async (
    calendarId?: string,
    serviceTypeId?: string
  ) => {
    setLoading(true);
    
    try {
      let query = supabase
        .from('available_slots_view')
        .select('*');

      if (calendarId) {
        query = query.eq('calendar_id', calendarId);
      }

      if (serviceTypeId) {
        query = query.eq('service_type_id', serviceTypeId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching slots from view:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching slots from view:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    getAvailableSlots,
    getAvailableSlotsRange,
    getAvailableSlotsFromView
  };
};
