
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useAuth } from '@/hooks/useAuth';

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
  const { user, loading: authLoading } = useAuth();
  const calendarId = selectedCalendar?.id;
  const key = user?.id && calendarId && !authLoading
    ? JSON.stringify([user.id, calendarId])
    : null;
  const [snapshot, setSnapshot] = useState<{
    key: string | null;
    metrics: DashboardMetrics | null;
    loading: boolean;
    error: string | null;
  }>({ key: null, metrics: null, loading: false, error: null });
  const refresh = useRef<() => void>(() => {});

  useEffect(() => {
    if (!key || !calendarId) {
      refresh.current = () => {};
      setSnapshot({ key: null, metrics: null, loading: false, error: null });
      return;
    }

    let active = true;
    let request = 0;
    const fetchMetrics = async () => {
      if (!active) return;
      const currentRequest = ++request;
      setSnapshot({ key, metrics: null, loading: true, error: null });
      try {
        const { data, error: rpcError } = await supabase.rpc('get_dashboard_metrics', {
          p_calendar_id: calendarId,
        });
        if (!active || currentRequest !== request) return;
        if (rpcError || !data || typeof data !== 'object' || Array.isArray(data)) {
          setSnapshot({ key, metrics: null, loading: false, error: 'Fout bij ophalen dashboard gegevens' });
          return;
        }
        setSnapshot({ key, metrics: parseDashboardMetrics(data as Record<string, unknown>), loading: false, error: null });
      } catch {
        if (!active || currentRequest !== request) return;
        setSnapshot({ key, metrics: null, loading: false, error: 'Er is een fout opgetreden bij het laden van de dashboard gegevens' });
      }
    };

    refresh.current = () => { void fetchMetrics(); };
    void fetchMetrics();
    const channel = supabase.channel(`whatsapp-analytics-${calendarId}`);
    for (const table of ['whatsapp_messages', 'whatsapp_conversations', 'booking_intents']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => { void fetchMetrics(); });
    }
    channel.subscribe();
    return () => {
      active = false;
      refresh.current = () => {};
      supabase.removeChannel(channel);
    };
  }, [key, calendarId]);

  const refreshMetrics = useCallback(() => refresh.current(), []);
  // Mask the old account/calendar snapshot in the switching render, before
  // effect cleanup or the next request can run. Unknown is not measured zero.
  const current = key !== null && snapshot.key === key;
  return {
    metrics: current ? snapshot.metrics : null,
    loading: key !== null && (!current || snapshot.loading),
    error: current ? snapshot.error : null,
    refreshMetrics,
    hasCalendar: key !== null,
  };
};
