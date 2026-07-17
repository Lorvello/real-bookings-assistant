import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import {
  parseDashboardMetrics,
  type DashboardMetrics,
} from './useDashboardAnalytics';

type BookingRow = Database['public']['Tables']['bookings']['Row'];
type WhatsAppConversationRow = Database['public']['Tables']['whatsapp_conversations']['Row'];

export interface ParallelDashboardData {
  metrics: DashboardMetrics | null;
  bookings: BookingRow[];
  conversations: WhatsAppConversationRow[];
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
        metricsData = parseDashboardMetrics(
          metricsResponse.data as Record<string, unknown>,
        );
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
