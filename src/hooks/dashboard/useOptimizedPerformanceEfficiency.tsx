
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PerformanceEfficiencyData {
  avg_response_time_minutes: number;
  no_show_rate: number;
  cancellation_rate: number;
  calendar_utilization_rate: number;
  peak_hours: Array<{
    hour: number;
    bookings: number;
    hour_label: string;
  }>;
  last_updated: string;
}

export function useOptimizedPerformanceEfficiency(
  calendarId?: string,
  startDate?: Date,
  endDate?: Date
) {
  return useQuery({
    queryKey: ['optimized-performance-efficiency', calendarId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<PerformanceEfficiencyData | null> => {
      if (!calendarId || !startDate || !endDate) return null;

      console.log('⚡ Fetching performance efficiency for:', calendarId, startDate, endDate);

      // Get bookings for the selected date range
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('calendar_id', calendarId)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString());

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        throw bookingsError;
      }

      // Get WhatsApp messages for response time calculation (limited to last 7 days for performance)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const responseTimeStartDate = startDate > sevenDaysAgo ? startDate : sevenDaysAgo;

      const { data: messagesData, error: messagesError } = await supabase
        .from('whatsapp_messages')
        .select(`
          *,
          conversation_id!inner(calendar_id)
        `)
        .eq('conversation_id.calendar_id', calendarId)
        .gte('created_at', responseTimeStartDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at');

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
      }

      const allBookings = bookingsData || [];
      const totalBookings = allBookings.length;
      const noShowBookings = allBookings.filter(b => b.status === 'no-show').length;
      const cancelledBookings = allBookings.filter(b => b.status === 'cancelled').length;

      // Calculate peak hours for the selected period
      const hourCounts = new Map();
      allBookings.forEach(booking => {
        if (booking.status !== 'cancelled') {
          const hour = new Date(booking.start_time).getHours();
          hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
        }
      });

      const peakHours = Array.from(hourCounts.entries())
        .map(([hour, bookings]) => ({ 
          hour: Number(hour), 
          bookings,
          hour_label: `${String(hour).padStart(2, '0')}:00`
        }))
        .sort((a, b) => b.bookings - a.bookings);

      // Calculate response time (simplified - average between inbound and outbound messages)
      let totalResponseTime = 0;
      let responseCount = 0;
      
      if (messagesData) {
        const conversations = new Map();
        messagesData.forEach(msg => {
          if (!conversations.has(msg.conversation_id)) {
            conversations.set(msg.conversation_id, []);
          }
          conversations.get(msg.conversation_id).push(msg);
        });

        conversations.forEach(msgs => {
          for (let i = 0; i < msgs.length - 1; i++) {
            const current = msgs[i];
            const next = msgs[i + 1];
            
            if (current.direction === 'inbound' && next.direction === 'outbound') {
              const responseTime = new Date(next.created_at).getTime() - new Date(current.created_at).getTime();
              totalResponseTime += responseTime / (1000 * 60); // Convert to minutes
              responseCount++;
            }
          }
        });
      }

      const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

      // Simple utilization calculation based on the selected period
      const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const workingHoursPerDay = 8; // Assumption
      const totalAvailableHours = periodDays * workingHoursPerDay;
      const bookedHours = allBookings
        .filter(b => b.status !== 'cancelled')
        .reduce((sum, b) => sum + (b.booking_duration || 30) / 60, 0);
      
      const utilizationRate = totalAvailableHours > 0 ? (bookedHours / totalAvailableHours) * 100 : 0;

      return {
        avg_response_time_minutes: avgResponseTime,
        no_show_rate: totalBookings > 0 ? (noShowBookings / totalBookings) * 100 : 0,
        cancellation_rate: totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0,
        calendar_utilization_rate: Math.min(utilizationRate, 100),
        peak_hours: peakHours,
        last_updated: new Date().toISOString()
      };
    },
    enabled: !!calendarId && !!startDate && !!endDate,
    staleTime: 600000, // 10 minutes
    gcTime: 1200000, // 20 minutes
    refetchInterval: 900000, // 15 minutes
    refetchIntervalInBackground: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
  });
}
