
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMockDataControl } from '@/hooks/useMockDataControl';
import { formatTimeUntil } from '@/lib/timeUntil';
import { COUNTED_BOOKING_STATUSES } from '@/lib/bookingStatus';

export function useNextAppointment(calendarIds: string[]) {
  const { useMockData } = useMockDataControl();
  
  return useQuery({
    queryKey: ['next-appointment', calendarIds],
    queryFn: async () => {
      if (!calendarIds || calendarIds.length === 0) return null;

      // Sample data for developers or setup_incomplete users (clearly labelled in the UI)
      if (useMockData) {
        const nextTime = new Date();
        nextTime.setHours(nextTime.getHours() + 2, 30, 0, 0);
        return {
          customer_name: 'Emma van der Berg',
          service_name: 'Knippen & Stylen',
          start_time: nextTime.toISOString(),
          time_until: formatTimeUntil(nextTime.toISOString()),
          is_sample: true
        };
      }

      const now = new Date();
      
      const { data: nextAppointment, error } = await supabase
        .from('bookings')
        .select(`
          customer_name,
          service_name,
          start_time,
          service_types!inner(name)
        `)
        .in('calendar_id', calendarIds)
        .in('status', [...COUNTED_BOOKING_STATUSES])
        .gte('start_time', now.toISOString())
        .order('start_time', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching next appointment:', error);
        throw error;
      }

      if (!nextAppointment) return null;

      // Human "in Xd Yh / in Xh Ym" with day rollover (no raw "132h" — the live bug).
      return {
        customer_name: nextAppointment.customer_name,
        service_name: nextAppointment.service_name || nextAppointment.service_types?.name,
        start_time: nextAppointment.start_time,
        time_until: formatTimeUntil(nextAppointment.start_time, now)
      };
    },
    enabled: !!calendarIds && calendarIds.length > 0,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
  });
}
