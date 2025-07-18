import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getEnvironmentConfig } from '@/utils/environment';

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

// Helper function to check if user should see mock data
// Only returns true in development environment
export function shouldUseMockData(user: any) {
  const { allowMockData } = getEnvironmentConfig();
  
  // In production, never show mock data regardless of subscription status
  if (!allowMockData) {
    return false;
  }
  
  // In development, show mock data for trial users or users without subscription
  return user?.subscription_status === 'trial' || !user?.subscription_status;
}

// Mock data generators for each dashboard section
export const getMockFutureInsightsData = () => {
  return {
    demand_forecast: [
      { week_number: 1, bookings: 12, trend_direction: 'up' },
      { week_number: 2, bookings: 15, trend_direction: 'up' },
      { week_number: 3, bookings: 18, trend_direction: 'up' },
      { week_number: 4, bookings: 16, trend_direction: 'down' }
    ],
    customer_growth_rate: 23.5,
    returning_customers_month: 8,
    seasonal_patterns: [
      { month_name: 'January', avg_bookings: 15 },
      { month_name: 'February', avg_bookings: 18 },
      { month_name: 'March', avg_bookings: 22 },
      { month_name: 'April', avg_bookings: 25 },
      { month_name: 'May', avg_bookings: 28 },
      { month_name: 'June', avg_bookings: 24 }
    ],
    last_updated: new Date().toISOString()
  };
};

export const getMockPerformanceData = () => {
  return {
    booking_efficiency: 87.5,
    no_show_rate: 3.2,
    cancellation_rate: 8.7,
    avg_revenue_per_day: 245.50,
    peak_hours: [
      { hour: 10, bookings: 8, hour_label: '10:00' },
      { hour: 14, bookings: 12, hour_label: '14:00' },
      { hour: 16, bookings: 10, hour_label: '16:00' },
      { hour: 11, bookings: 7, hour_label: '11:00' },
      { hour: 15, bookings: 6, hour_label: '15:00' }
    ],
    last_updated: new Date().toISOString()
  };
};

export const getMockLiveOperationsData = () => ({
  today_bookings: 3 + Math.floor(Math.random() * 6), // 3-8 bookings
  today_pending: Math.floor(Math.random() * 3), // 0-2 pending
  today_confirmed: 2 + Math.floor(Math.random() * 4), // 2-5 confirmed
  currently_active_bookings: Math.floor(Math.random() * 2), // 0-1 active
  next_appointment_time: new Date(Date.now() + (2 + Math.random() * 4) * 60 * 60 * 1000).toISOString(),
  whatsapp_messages_last_hour: 5 + Math.floor(Math.random() * 15), // 5-20 messages
  last_updated: new Date().toISOString()
});

export const getMockBusinessIntelligenceData = () => ({
  current_period_revenue: 2500 + Math.random() * 2000, // €2500-4500
  prev_period_revenue: 2200 + Math.random() * 1800, // €2200-4000
  unique_customers: 45 + Math.floor(Math.random() * 30), // 45-75 customers
  avg_booking_value: 75 + Math.random() * 50, // €75-125
  whatsapp_conversion_rate: 35 + Math.random() * 25, // 35-60%
  service_performance: [
    { service_name: 'Standaard Behandeling', booking_count: 25, revenue: 1875, avg_price: 75 },
    { service_name: 'Premium Service', booking_count: 12, revenue: 1440, avg_price: 120 },
    { service_name: 'Consultatie', booking_count: 8, revenue: 400, avg_price: 50 }
  ],
  last_updated: new Date().toISOString()
});

// Extended mock WhatsApp contacts
export const getMockWhatsAppContacts = () => [
  {
    id: 'mock-1',
    phone_number: '+31612345678',
    display_name: 'Emma van der Berg',
    first_name: 'Emma',
    last_name: 'van der Berg',
    linked_customer_email: 'emma.vandenberg@email.com',
    profile_picture_url: null,
    metadata: {},
    last_seen_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'mock-2',
    phone_number: '+31623456789',
    display_name: 'Lars Janssen',
    first_name: 'Lars',
    last_name: 'Janssen',
    linked_customer_email: 'lars.janssen@email.com',
    profile_picture_url: null,
    metadata: {},
    last_seen_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'mock-3',
    phone_number: '+31634567890',
    display_name: 'Sophie de Vries',
    first_name: 'Sophie',
    last_name: 'de Vries',
    linked_customer_email: 'sophie.devries@email.com',
    profile_picture_url: null,
    metadata: {},
    last_seen_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'mock-4',
    phone_number: '+31645678901',
    display_name: 'Daan Peters',
    first_name: 'Daan',
    last_name: 'Peters',
    linked_customer_email: 'daan.peters@email.com',
    profile_picture_url: null,
    metadata: {},
    last_seen_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'mock-5',
    phone_number: '+31656789012',
    display_name: 'Lisa van Dijk',
    first_name: 'Lisa',
    last_name: 'van Dijk',
    linked_customer_email: 'lisa.vandijk@email.com',
    profile_picture_url: null,
    metadata: {},
    last_seen_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },
  {
    id: 'mock-6',
    phone_number: '+31667890123',
    display_name: 'Max Bakker',
    first_name: 'Max',
    last_name: 'Bakker',
    linked_customer_email: 'max.bakker@email.com',
    profile_picture_url: null,
    metadata: {},
    last_seen_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  }
];

// Mock WhatsApp conversations with real messages
export const getMockWhatsAppConversations = () => [
  {
    id: 'conv-1',
    calendar_id: null,
    contact_id: 'mock-1',
    status: 'active',
    last_message_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    session_id: 'session-1',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    context: {},
    message: {
      content: 'Hallo, ik wil graag een afspraak maken voor volgende week',
      direction: 'inbound',
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    id: 'conv-2',
    calendar_id: null,
    contact_id: 'mock-2',
    status: 'active',
    last_message_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    session_id: 'session-2',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    context: {},
    message: {
      content: 'Kan ik mijn afspraak van donderdag verschuiven?',
      direction: 'inbound',
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    id: 'conv-3',
    calendar_id: null,
    contact_id: 'mock-3',
    status: 'closed',
    last_message_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    session_id: 'session-3',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    context: {},
    message: {
      content: 'Dank je wel voor de afspraak, tot morgen!',
      direction: 'outbound',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    id: 'conv-4',
    calendar_id: null,
    contact_id: 'mock-4',
    status: 'active',
    last_message_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    session_id: 'session-4',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    context: {},
    message: {
      content: 'Is er nog plek beschikbaar deze week?',
      direction: 'inbound',
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    }
  }
];

// Mock orphaned conversations
export const getMockOrphanedConversations = () => [
  {
    conversation_id: 'conv-orphan-1',
    contact_phone: '+31678901234',
    contact_name: 'Nina Visser',
    message_count: 5,
    last_activity: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  },
  {
    conversation_id: 'conv-orphan-2',
    contact_phone: '+31689012345',
    contact_name: 'Tom de Jong',
    message_count: 3,
    last_activity: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  },
  {
    conversation_id: 'conv-orphan-3',
    contact_phone: '+31690123456',
    contact_name: 'Anna Smit',
    message_count: 8,
    last_activity: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  }
];
