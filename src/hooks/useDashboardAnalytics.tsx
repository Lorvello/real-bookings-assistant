
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCalendarContext } from '@/contexts/CalendarContext';

export interface DashboardMetrics {
  today_bookings: number;
  pending_bookings: number;
  week_bookings: number;
  month_bookings: number;
  total_revenue: number;
  conversion_rate: number;
  avg_response_time: number;
  whatsapp_conversations: number;
  whatsapp_messages_today: number;
  last_updated: string;
}

export const useDashboardAnalytics = () => {
  const { selectedCalendar } = useCalendarContext();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    today_bookings: 0,
    pending_bookings: 0,
    week_bookings: 0,
    month_bookings: 0,
    total_revenue: 0,
    conversion_rate: 0,
    avg_response_time: 0,
    whatsapp_conversations: 0,
    whatsapp_messages_today: 0,
    last_updated: new Date().toISOString()
  });
  // Start with loading false to prevent skeleton screens on tab switches
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCalendar?.id) {
      fetchMetrics();
      
      // Set up real-time subscription for WhatsApp analytics
      const channel = supabase
        .channel(`whatsapp-analytics-${selectedCalendar.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'whatsapp_messages',
          },
          () => {
            console.log('WhatsApp message change detected, refreshing metrics');
            fetchMetrics();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'whatsapp_conversations',
          },
          () => {
            console.log('WhatsApp conversation change detected, refreshing metrics');
            fetchMetrics();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'booking_intents',
          },
          () => {
            console.log('Booking intent change detected, refreshing metrics');
            fetchMetrics();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setLoading(false);
    }
  }, [selectedCalendar]);

  const fetchMetrics = async () => {
    if (!selectedCalendar?.id) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching enhanced dashboard metrics for calendar:', selectedCalendar.id);

      const { data, error: rpcError } = await supabase
        .rpc('get_dashboard_metrics', {
          p_calendar_id: selectedCalendar.id
        });

      if (rpcError) {
        console.error('RPC Error:', rpcError);
        setError('Fout bij ophalen dashboard gegevens');
        return;
      }

      console.log('Enhanced dashboard metrics data:', data);

      if (data && typeof data === 'object') {
        const metricsData = data as Record<string, any>;
        setMetrics({
          today_bookings: Number(metricsData.today_bookings) || 0,
          pending_bookings: Number(metricsData.pending_bookings) || 0,
          week_bookings: Number(metricsData.week_bookings) || 0,
          month_bookings: Number(metricsData.month_bookings) || 0,
          total_revenue: Number(metricsData.total_revenue) || 0,
          conversion_rate: Number(metricsData.conversion_rate) || 0,
          avg_response_time: Number(metricsData.avg_response_time) || 0,
          whatsapp_conversations: Number(metricsData.whatsapp_conversations) || 0,
          whatsapp_messages_today: Number(metricsData.whatsapp_messages_today) || 0,
          last_updated: metricsData.last_updated || new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error fetching enhanced dashboard metrics:', error);
      setError('Er is een fout opgetreden bij het laden van de dashboard gegevens');
    } finally {
      setLoading(false);
    }
  };

  const refreshMetrics = () => {
    if (selectedCalendar?.id) {
      fetchMetrics();
    }
  };

  return {
    metrics,
    loading,
    error,
    refreshMetrics,
    hasCalendar: !!selectedCalendar?.id
  };
};
