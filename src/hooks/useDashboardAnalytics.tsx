
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
    last_updated: new Date().toISOString()
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCalendar?.id) {
      fetchMetrics();
    } else {
      setLoading(false);
    }
  }, [selectedCalendar]);

  const fetchMetrics = async () => {
    if (!selectedCalendar?.id) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching dashboard metrics for calendar:', selectedCalendar.id);

      // Gebruik de veilige dashboard metrics functie
      const { data, error: rpcError } = await supabase
        .rpc('get_dashboard_metrics_safe', {
          p_calendar_id: selectedCalendar.id
        });

      if (rpcError) {
        console.error('RPC Error:', rpcError);
        setError('Fout bij ophalen dashboard gegevens');
        return;
      }

      console.log('Dashboard metrics data:', data);

      if (data) {
        setMetrics({
          today_bookings: data.today_bookings || 0,
          pending_bookings: data.pending_bookings || 0,
          week_bookings: data.week_bookings || 0,
          month_bookings: data.month_bookings || 0,
          total_revenue: data.total_revenue || 0,
          conversion_rate: data.conversion_rate || 0,
          avg_response_time: data.avg_response_time || 0,
          last_updated: data.last_updated || new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
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
