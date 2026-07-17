import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EnhancedDashboardMetrics } from './EnhancedDashboardMetrics';
import type { DashboardMetrics } from '@/hooks/useDashboardAnalytics';

const baseMetrics: DashboardMetrics = {
  today_bookings: 0,
  pending_bookings: 0,
  week_bookings: 0,
  month_bookings: 0,
  total_revenue: 0,
  total_revenue_currency: null,
  total_revenue_status: 'no_retained_revenue',
  total_revenue_window_start: '2026-07-01T00:00:00.000Z',
  total_revenue_window_end: '2026-08-01T00:00:00.000Z',
  total_revenue_window_basis: 'booking_start_time',
  contacts_later_booked: 0,
  contacts_later_booked_sample_count: 0,
  contacts_later_booked_source: 'phone_or_email_correlation',
  avg_response_time: null,
  avg_response_time_sample_count: 0,
  whatsapp_conversations: 0,
  whatsapp_messages_today: 0,
  last_updated: '2026-07-17T00:00:00.000Z',
};

describe('EnhancedDashboardMetrics response-time truth', () => {
  it('shows no data when there are no delivered response samples', () => {
    render(<EnhancedDashboardMetrics analytics={baseMetrics} />);

    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.getByText('No delivered replies yet')).toBeInTheDocument();
    expect(screen.queryByText('AI Bot active')).not.toBeInTheDocument();
  });

  it('shows a measured zero-minute response when a real tied sample exists', () => {
    render(
      <EnhancedDashboardMetrics
        analytics={{
          ...baseMetrics,
          avg_response_time: 0,
          avg_response_time_sample_count: 1,
        }}
      />,
    );

    expect(screen.getByText('0.0min')).toBeInTheDocument();
    expect(screen.getByText('Average')).toBeInTheDocument();
    expect(screen.queryByText('No data')).not.toBeInTheDocument();
  });

  it('labels period counts and phone/email correlation without causal claims', () => {
    render(
      <EnhancedDashboardMetrics
        analytics={{
          ...baseMetrics,
          pending_bookings: 1,
          week_bookings: 2,
          contacts_later_booked: 1,
          contacts_later_booked_sample_count: 2,
        }}
      />,
    );

    expect(screen.getByText('1 pending today')).toBeInTheDocument();
    expect(screen.getByText('Confirmed appointments only')).toBeInTheDocument();
    expect(screen.getByText('Contacts Later Booked')).toBeInTheDocument();
    expect(screen.getByText('2 recent contacts · phone/email match')).toBeInTheDocument();
    expect(screen.queryByText('WhatsApp Conversion')).not.toBeInTheDocument();
    expect(screen.queryByText('Chat to booking')).not.toBeInTheDocument();
  });

  it('formats one retained currency and fails closed for mixed currencies', () => {
    const { rerender } = render(
      <EnhancedDashboardMetrics
        analytics={{
          ...baseMetrics,
          total_revenue: 145,
          total_revenue_currency: 'eur',
          total_revenue_status: 'single_currency',
        }}
      />,
    );

    expect(screen.getByText('€145.00')).toBeInTheDocument();
    expect(
      screen.getByText('EUR retained after refunds · appointments this month'),
    ).toBeInTheDocument();

    rerender(
      <EnhancedDashboardMetrics
        analytics={{
          ...baseMetrics,
          total_revenue: null,
          total_revenue_currency: null,
          total_revenue_status: 'mixed_currencies',
        }}
      />,
    );

    expect(screen.getByText('Mixed currencies')).toBeInTheDocument();
    expect(screen.getByText('Cannot total multiple currencies')).toBeInTheDocument();
  });
});
