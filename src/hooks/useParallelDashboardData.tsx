import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardMetrics } from './useDashboardAnalytics';

export interface ParallelDashboardData {
  metrics: DashboardMetrics | null;
  bookings: any[];
  conversations: any[];
}

export const useParallelDashboardData = (calendarId: string | null) => {
  const [data, setData] = useState<ParallelDashboardData>({
    metrics: null,
    bookings: [],
    conversations: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    if (!calendarId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [metricsResponse, bookingsResponse, conversationsResponse] = await Promise.all([
        supabase.rpc('get_dashboard_metrics', { p_calendar_id: calendarId }),
        supabase
          .from('bookings')
          .select('*')
          .eq('calendar_id', calendarId)
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(10),
        supabase
          .from('whatsapp_conversations')
          .select('*')
          .eq('calendar_id', calendarId)
          .order('last_message_at', { ascending: false })
          .limit(5)
      ]);

      // Handle metrics
      let metricsData: DashboardMetrics | null = null;
      if (metricsResponse.data && typeof metricsResponse.data === 'object') {
        const data = metricsResponse.data as Record<string, any>;
        metricsData = {
          today_bookings: Number(data.today_bookings) || 0,
          pending_bookings: Number(data.pending_bookings) || 0,
          week_bookings: Number(data.week_bookings) || 0,
          month_bookings: Number(data.month_bookings) || 0,
          total_revenue: Number(data.total_revenue) || 0,
          conversion_rate: Number(data.conversion_rate) || 0,
          avg_response_time: Number(data.avg_response_time) || 0,
          whatsapp_conversations: Number(data.whatsapp_conversations) || 0,
          whatsapp_messages_today: Number(data.whatsapp_messages_today) || 0,
          last_updated: data.last_updated || new Date().toISOString()
        };
      }

      setData({
        metrics: metricsData,
        bookings: bookingsResponse.data || [],
        conversations: conversationsResponse.data || []
      });
    } catch (err) {
      console.error('Error fetching parallel dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [calendarId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return {
    data,
    loading,
    error,
    refetch: fetchAllData
  };
};
