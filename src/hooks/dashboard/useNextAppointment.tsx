
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMockDataControl } from '@/hooks/useMockDataControl';

export function useNextAppointment(calendarIds: string[]) {
  const { useMockData } = useMockDataControl();
  
  return useQuery({
    queryKey: ['next-appointment', calendarIds],
    queryFn: async () => {
      if (!calendarIds || calendarIds.length === 0) return null;

      console.log('🔍 Fetching next appointment for calendars:', calendarIds);

      // Mock data for developers or setup_incomplete users
      if (useMockData) {
        const nextTime = new Date();
        nextTime.setHours(nextTime.getHours() + 2, 30, 0, 0);
        return {
          customer_name: 'Emma van der Berg',
          service_name: 'Knippen & Stylen',
          start_time: nextTime.toISOString(),
          time_until: '2h 30m'
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
        .eq('status', 'confirmed')
        .gte('start_time', now.toISOString())
        .order('start_time', { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching next appointment:', error);
        throw error;
      }

      if (!nextAppointment) return null;

      // Calculate time until appointment
      const appointmentTime = new Date(nextAppointment.start_time);
      const timeDiff = appointmentTime.getTime() - now.getTime();
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      
      let timeUntil = '';
      if (timeDiff <= 0) {
        timeUntil = "Nu bezig";
      } else if (hours > 0) {
        timeUntil = `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        timeUntil = `${minutes}m`;
      } else {
        timeUntil = "< 1m";
      }

      return {
        customer_name: nextAppointment.customer_name,
        service_name: nextAppointment.service_name || nextAppointment.service_types?.name,
        start_time: nextAppointment.start_time,
        time_until: timeUntil
      };
    },
    enabled: !!calendarIds && calendarIds.length > 0,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
  });
}
