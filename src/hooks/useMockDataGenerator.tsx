import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useMockDataGenerator() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ calendarId, dataType = 'all' }: { calendarId: string; dataType?: string }) => {
      const { data, error } = await supabase.rpc('admin_generate_comprehensive_mock_data', {
        p_calendar_id: calendarId,
        p_data_type: dataType
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate all relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['optimized-business-intelligence', variables.calendarId] });
      queryClient.invalidateQueries({ queryKey: ['optimized-performance-efficiency', variables.calendarId] });
      queryClient.invalidateQueries({ queryKey: ['optimized-live-operations', variables.calendarId] });
      queryClient.invalidateQueries({ queryKey: ['optimized-future-insights', variables.calendarId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations', variables.calendarId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contacts', variables.calendarId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', variables.calendarId] });
      
      toast({
        title: "Mock data generated",
        description: "Dashboard data has been populated with sample data",
      });
    },
    onError: (error) => {
      console.error('Error generating mock data:', error);
      toast({
        title: "Error",
        description: "Failed to generate mock data",
        variant: "destructive",
      });
    },
  });
}

// Helper function to check if user is in trial mode and needs mock data
export function shouldUseMockData(user: any) {
  return user?.subscription_status === 'trial' || !user?.subscription_status;
}

// Mock data generators for each dashboard section
export const getMockPerformanceData = () => ({
  avg_response_time_minutes: 8.5 + Math.random() * 7,
  no_show_rate: 5 + Math.random() * 8,
  cancellation_rate: 8 + Math.random() * 7,
  calendar_utilization_rate: 65 + Math.random() * 25,
  peak_hours: [
    { hour: 10, bookings: 8, hour_label: '10:00' },
    { hour: 14, bookings: 12, hour_label: '14:00' },
    { hour: 15, bookings: 10, hour_label: '15:00' },
    { hour: 11, bookings: 7, hour_label: '11:00' },
    { hour: 16, bookings: 6, hour_label: '16:00' }
  ],
  last_updated: new Date().toISOString()
});

export const getMockLiveOperationsData = () => ({
  today_bookings: 3 + Math.floor(Math.random() * 6),
  today_pending: Math.floor(Math.random() * 3),
  today_confirmed: 2 + Math.floor(Math.random() * 4),
  currently_active_bookings: Math.floor(Math.random() * 2),
  next_appointment_time: new Date(Date.now() + (2 + Math.random() * 4) * 60 * 60 * 1000).toISOString(),
  whatsapp_messages_last_hour: 3 + Math.floor(Math.random() * 12),
  last_updated: new Date().toISOString()
});

export const getMockFutureInsightsData = () => ({
  demand_forecast: [
    { week_number: 1, bookings: 12 + Math.floor(Math.random() * 8), trend_direction: 'up' },
    { week_number: 2, bookings: 15 + Math.floor(Math.random() * 6), trend_direction: 'up' },
    { week_number: 3, bookings: 18 + Math.floor(Math.random() * 5), trend_direction: 'stable' },
    { week_number: 4, bookings: 16 + Math.floor(Math.random() * 7), trend_direction: 'down' }
  ],
  waitlist_size: 3 + Math.floor(Math.random() * 12),
  returning_customers_month: 15 + Math.floor(Math.random() * 25),
  seasonal_patterns: [
    { month_name: 'Januari', avg_bookings: 25 },
    { month_name: 'Februari', avg_bookings: 30 },
    { month_name: 'Maart', avg_bookings: 35 },
    { month_name: 'April', avg_bookings: 28 },
    { month_name: 'Mei', avg_bookings: 32 },
    { month_name: 'Juni', avg_bookings: 40 }
  ],
  last_updated: new Date().toISOString()
});

export const getMockBusinessIntelligenceData = () => ({
  current_period_revenue: 2500 + Math.random() * 2000,
  prev_period_revenue: 2200 + Math.random() * 1800,
  unique_customers: 45 + Math.floor(Math.random() * 30),
  avg_booking_value: 75 + Math.random() * 50,
  whatsapp_conversion_rate: 35 + Math.random() * 25,
  service_performance: [
    { service_name: 'Standaard Behandeling', booking_count: 25, revenue: 1875, avg_price: 75 },
    { service_name: 'Premium Service', booking_count: 12, revenue: 1440, avg_price: 120 },
    { service_name: 'Consultatie', booking_count: 8, revenue: 400, avg_price: 50 }
  ],
  last_updated: new Date().toISOString()
});