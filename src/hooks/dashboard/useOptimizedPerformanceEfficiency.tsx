
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PerformanceEfficiencyData {
  avg_response_time_minutes: number;
  no_show_rate: number;
  cancellation_rate: number;
  calendar_utilization_rate: number;
  peak_hours: Array<{
    hour: number;
    count: number;
  }>;
  last_updated: string;
}

export function useOptimizedPerformanceEfficiency(calendarId?: string) {
  return useQuery({
    queryKey: ['optimized-performance-efficiency', calendarId],
    queryFn: async (): Promise<PerformanceEfficiencyData | null> => {
      if (!calendarId) return null;

      console.log('⚡ Fetching performance efficiency for:', calendarId);

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Get bookings for the last 30 days
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('calendar_id', calendarId)
        .gte('start_time', thirtyDaysAgo.toISOString());

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        throw bookingsError;
      }

      // Get WhatsApp messages for response time calculation
      const { data: messagesData, error: messagesError } = await supabase
        .from('whatsapp_messages')
        .select(`
          *,
          conversation_id!inner(calendar_id)
        `)
        .eq('conversation_id.calendar_id', calendarId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at');

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
      }

      const allBookings = bookingsData || [];
      const totalBookings = allBookings.length;
      const noShowBookings = allBookings.filter(b => b.status === 'no-show').length;
      const cancelledBookings = allBookings.filter(b => b.status === 'cancelled').length;

      // Calculate peak hours
      const hourCounts = new Map();
      allBookings.forEach(booking => {
        if (booking.status !== 'cancelled') {
          const hour = new Date(booking.start_time).getHours();
          hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
        }
      });

      const peakHours = Array.from(hourCounts.entries())
        .map(([hour, count]) => ({ hour: Number(hour), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

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

      // Simple utilization calculation (bookings vs available hours)
      const workingHoursPerWeek = 40; // Assumption
      const weeksInMonth = 4.33;
      const totalAvailableHours = workingHoursPerWeek * weeksInMonth;
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
    enabled: !!calendarId,
    staleTime: 300000, // 5 minutes
    gcTime: 600000, // 10 minutes
    refetchInterval: 600000, // 10 minutes
    refetchIntervalInBackground: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
