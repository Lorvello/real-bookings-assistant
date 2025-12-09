import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Calendar } from '@/types/database';

interface AvailabilityRule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface CalendarAvailabilitySummary {
  calendarId: string;
  calendarName: string;
  calendarColor: string | null;
  days: {
    dayOfWeek: number;
    dayName: string;
    isAvailable: boolean;
    startTime: string | null;
    endTime: string | null;
  }[];
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const useCalendarAvailabilitySummary = (calendars: Calendar[]) => {
  const calendarIds = calendars.map(c => c.id);

  const { data: schedulesData, isLoading: schedulesLoading } = useQuery({
    queryKey: ['availability-schedules-all', calendarIds],
    queryFn: async () => {
      if (calendarIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('availability_schedules')
        .select('id, calendar_id, is_default')
        .in('calendar_id', calendarIds)
        .eq('is_default', true);

      if (error) throw error;
      return data || [];
    },
    enabled: calendarIds.length > 0,
  });

  const scheduleIds = schedulesData?.map(s => s.id) || [];

  const { data: rulesData, isLoading: rulesLoading } = useQuery({
    queryKey: ['availability-rules-all', scheduleIds],
    queryFn: async () => {
      if (scheduleIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('availability_rules')
        .select('schedule_id, day_of_week, start_time, end_time, is_available')
        .in('schedule_id', scheduleIds);

      if (error) throw error;
      return data || [];
    },
    enabled: scheduleIds.length > 0,
  });

  const summaries = useMemo<CalendarAvailabilitySummary[]>(() => {
    if (!schedulesData || !rulesData) return [];

    return calendars.map(calendar => {
      const schedule = schedulesData.find(s => s.calendar_id === calendar.id);
      const rules = schedule 
        ? rulesData.filter(r => r.schedule_id === schedule.id)
        : [];

      const days = Array.from({ length: 7 }, (_, dayOfWeek) => {
        const rule = rules.find(r => r.day_of_week === dayOfWeek && r.is_available);
        return {
          dayOfWeek,
          dayName: DAY_NAMES[dayOfWeek],
          isAvailable: !!rule,
          startTime: rule?.start_time || null,
          endTime: rule?.end_time || null,
        };
      });

      return {
        calendarId: calendar.id,
        calendarName: calendar.name || 'Unnamed Calendar',
        calendarColor: calendar.color || null,
        days,
      };
    });
  }, [calendars, schedulesData, rulesData]);

  return {
    summaries,
    isLoading: schedulesLoading || rulesLoading,
  };
};
