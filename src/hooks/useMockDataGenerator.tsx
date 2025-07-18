export const getMockDashboardAnalytics = () => ({
  today_bookings: 5,
  pending_bookings: 2,
  week_bookings: 28,
  month_bookings: 110,
  total_revenue: 7500.00,
  conversion_rate: 15,
  avg_response_time: 2.5,
  last_updated: new Date().toISOString(),
  prev_week_bookings: 22,
  prev_month_revenue: 6800.00,
  prev_week_response_time: 3.1,
  prev_week_customers: 48
});

export const getMockWhatsAppAnalytics = () => ({
  total_messages: 520,
  responded_messages: 480,
  avg_response_time: 1.8,
  positive_feedback: 95,
  negative_feedback: 5,
  last_updated: new Date().toISOString()
});

export const getMockLiveOperationsData = () => ({
  today_bookings: 8,
  active_appointments: 2,
  active_conversations_today: 12,
  next_appointment_time: new Date(Date.now() + 2 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
  next_appointment_formatted: "2h 45m",
  last_updated: new Date().toISOString()
});

export const getMockPerformanceData = () => ({
  avg_booking_value: 75.50,
  no_show_rate: 8.2,
  cancellation_rate: 12.5,
  avg_revenue_per_day: 320.75,
  peak_hours: [
    { hour: 14, bookings: 8, hour_label: "14:00" },
    { hour: 15, bookings: 6, hour_label: "15:00" },
    { hour: 10, bookings: 5, hour_label: "10:00" },
    { hour: 11, bookings: 4, hour_label: "11:00" },
    { hour: 16, bookings: 3, hour_label: "16:00" }
  ],
  last_updated: new Date().toISOString()
});

export const getMockBusinessIntelligenceData = () => ({
  current_period_revenue: 4850.75,
  prev_period_revenue: 4200.50,
  unique_customers: 45,
  returning_customers: 18,
  avg_booking_value: 78.25,
  service_performance: [
    { service_name: "Knippen & Stylen", booking_count: 25, revenue: 1875.00, avg_price: 75.00 },
    { service_name: "Kleur Behandeling", booking_count: 18, revenue: 1980.00, avg_price: 110.00 },
    { service_name: "Massage", booking_count: 15, revenue: 1125.00, avg_price: 75.00 },
    { service_name: "Manicure", booking_count: 12, revenue: 480.00, avg_price: 40.00 }
  ],
  last_updated: new Date().toISOString()
});

export const getMockFutureInsightsData = () => ({
  demand_forecast: [
    { week_number: 1, bookings: 15, trend_direction: "up" },
    { week_number: 2, bookings: 18, trend_direction: "up" },
    { week_number: 3, bookings: 22, trend_direction: "up" },
    { week_number: 4, bookings: 20, trend_direction: "down" }
  ],
  customer_growth_rate: 12.8,
  capacity_utilization: 68.5,
  seasonal_patterns: [
    { month_name: "Januari", avg_bookings: 65 },
    { month_name: "Februari", avg_bookings: 58 },
    { month_name: "Maart", avg_bookings: 72 },
    { month_name: "April", avg_bookings: 68 },
    { month_name: "Mei", avg_bookings: 75 },
    { month_name: "Juni", avg_bookings: 80 },
    { month_name: "Juli", avg_bookings: 85 },
    { month_name: "Augustus", avg_bookings: 82 },
    { month_name: "September", avg_bookings: 78 },
    { month_name: "Oktober", avg_bookings: 70 },
    { month_name: "November", avg_bookings: 62 },
    { month_name: "December", avg_bookings: 88 }
  ],
  last_updated: new Date().toISOString()
});

export const getMockServicePerformanceData = () => ([
  { service_name: "Haircut", booking_count: 30, revenue: 1500, avg_price: 50 },
  { service_name: "Coloring", booking_count: 20, revenue: 2000, avg_price: 100 },
  { service_name: "Manicure", booking_count: 25, revenue: 1250, avg_price: 50 },
  { service_name: "Facial", booking_count: 15, revenue: 1800, avg_price: 120 }
]);
