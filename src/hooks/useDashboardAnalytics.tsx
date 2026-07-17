
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCalendarContext } from '@/contexts/CalendarContext';

export type DashboardRevenueStatus =
  | 'single_currency'
  | 'mixed_currencies'
  | 'no_retained_revenue'
  | 'unavailable';

export interface DashboardMetrics {
  today_bookings: number;
  pending_bookings: number;
  week_bookings: number;
  month_bookings: number;
  total_revenue: number | null;
  total_revenue_currency: string | null;
  total_revenue_status: DashboardRevenueStatus;
  total_revenue_window_start: string | null;
  total_revenue_window_end: string | null;
  total_revenue_window_basis: 'booking_start_time' | null;
  contacts_later_booked: number;
  contacts_later_booked_sample_count: number;
  contacts_later_booked_source: 'phone_or_email_correlation' | null;
  avg_response_time: number | null;
  avg_response_time_sample_count: number;
  whatsapp_conversations: number;
  whatsapp_messages_today: number;
  last_updated: string;
}

const finiteNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseDashboardMetrics = (
  metricsData: Record<string, unknown>,
): DashboardMetrics => {
  const rawRevenueStatus = metricsData.total_revenue_status;
  let revenueStatus: DashboardRevenueStatus =
    rawRevenueStatus === 'single_currency' ||
    rawRevenueStatus === 'mixed_currencies' ||
    rawRevenueStatus === 'no_retained_revenue'
      ? rawRevenueStatus
      : 'unavailable';
  const rawRevenue = finiteNumberOrNull(metricsData.total_revenue);
  const rawCurrency = typeof metricsData.total_revenue_currency === 'string'
    ? metricsData.total_revenue_currency.trim().toLowerCase()
    : null;
  const hasValidSingleCurrencyRevenue = revenueStatus === 'single_currency' &&
    rawRevenue !== null &&
    rawCurrency !== null &&
    /^[a-z]{3}$/.test(rawCurrency);

  if (revenueStatus === 'single_currency' && !hasValidSingleCurrencyRevenue) {
    revenueStatus = 'unavailable';
  }

  const responseTime = finiteNumberOrNull(metricsData.avg_response_time);

  return {
    today_bookings: finiteNumberOrNull(metricsData.today_bookings) ?? 0,
    pending_bookings: finiteNumberOrNull(metricsData.pending_bookings) ?? 0,
    week_bookings: finiteNumberOrNull(metricsData.week_bookings) ?? 0,
    month_bookings: finiteNumberOrNull(metricsData.month_bookings) ?? 0,
    total_revenue: hasValidSingleCurrencyRevenue
      ? rawRevenue
      : revenueStatus === 'no_retained_revenue'
        ? 0
        : null,
    total_revenue_currency: hasValidSingleCurrencyRevenue ? rawCurrency : null,
    total_revenue_status: revenueStatus,
    total_revenue_window_start:
      typeof metricsData.total_revenue_window_start === 'string'
        ? metricsData.total_revenue_window_start
        : null,
    total_revenue_window_end:
      typeof metricsData.total_revenue_window_end === 'string'
        ? metricsData.total_revenue_window_end
        : null,
    total_revenue_window_basis:
      metricsData.total_revenue_window_basis === 'booking_start_time'
        ? 'booking_start_time'
        : null,
    contacts_later_booked:
      finiteNumberOrNull(metricsData.contacts_later_booked) ?? 0,
    contacts_later_booked_sample_count:
      finiteNumberOrNull(metricsData.contacts_later_booked_sample_count) ?? 0,
    contacts_later_booked_source:
      metricsData.contacts_later_booked_source === 'phone_or_email_correlation'
        ? 'phone_or_email_correlation'
        : null,
    avg_response_time: responseTime,
    avg_response_time_sample_count:
      finiteNumberOrNull(metricsData.avg_response_time_sample_count) ?? 0,
    whatsapp_conversations:
      finiteNumberOrNull(metricsData.whatsapp_conversations) ?? 0,
    whatsapp_messages_today:
      finiteNumberOrNull(metricsData.whatsapp_messages_today) ?? 0,
    last_updated: typeof metricsData.last_updated === 'string'
      ? metricsData.last_updated
      : new Date().toISOString(),
  };
};

export const useDashboardAnalytics = () => {
  const { selectedCalendar } = useCalendarContext();
  const calendarId = selectedCalendar?.id;
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    today_bookings: 0,
    pending_bookings: 0,
    week_bookings: 0,
    month_bookings: 0,
    total_revenue: null,
    total_revenue_currency: null,
    total_revenue_status: 'unavailable',
    total_revenue_window_start: null,
    total_revenue_window_end: null,
    total_revenue_window_basis: null,
    contacts_later_booked: 0,
    contacts_later_booked_sample_count: 0,
    contacts_later_booked_source: null,
    avg_response_time: null,
    avg_response_time_sample_count: 0,
    whatsapp_conversations: 0,
    whatsapp_messages_today: 0,
    last_updated: new Date().toISOString()
  });
  // Start with loading false to prevent skeleton screens on tab switches
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!calendarId) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching enhanced dashboard metrics for calendar:', calendarId);

      const { data, error: rpcError } = await supabase
        .rpc('get_dashboard_metrics', {
          p_calendar_id: calendarId
        });

      if (rpcError) {
        console.error('RPC Error:', rpcError);
        setError('Fout bij ophalen dashboard gegevens');
        return;
      }

      console.log('Enhanced dashboard metrics data:', data);

      if (data && typeof data === 'object') {
        const metricsData = data as Record<string, unknown>;
        setMetrics(parseDashboardMetrics(metricsData));
      }
    } catch (error) {
      console.error('Error fetching enhanced dashboard metrics:', error);
      setError('Er is een fout opgetreden bij het laden van de dashboard gegevens');
    } finally {
      setLoading(false);
    }
  }, [calendarId]);

  useEffect(() => {
    if (calendarId) {
      void fetchMetrics();
      
      // Set up real-time subscription for WhatsApp analytics
      const channel = supabase
        .channel(`whatsapp-analytics-${calendarId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'whatsapp_messages',
          },
          () => {
            console.log('WhatsApp message change detected, refreshing metrics');
            void fetchMetrics();
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
            void fetchMetrics();
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
            void fetchMetrics();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setLoading(false);
    }
  }, [calendarId, fetchMetrics]);

  const refreshMetrics = () => {
    if (calendarId) {
      void fetchMetrics();
    }
  };

  return {
    metrics,
    loading,
    error,
    refreshMetrics,
    hasCalendar: !!calendarId
  };
};
