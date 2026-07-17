import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { DashboardMetrics } from '@/hooks/useDashboardAnalytics';

const testState = vi.hoisted(() => {
  const metrics: DashboardMetrics = {
    today_bookings: 3,
    pending_bookings: 1,
    week_bookings: 2,
    month_bookings: 4,
    total_revenue: 145,
    total_revenue_currency: 'eur',
    total_revenue_status: 'single_currency',
    total_revenue_window_start: '2026-07-01T00:00:00.000Z',
    total_revenue_window_end: '2026-08-01T00:00:00.000Z',
    total_revenue_window_basis: 'booking_start_time',
    contacts_later_booked: 1,
    contacts_later_booked_sample_count: 2,
    contacts_later_booked_source: 'phone_or_email_correlation',
    avg_response_time: 2.5,
    avg_response_time_sample_count: 2,
    whatsapp_conversations: 2,
    whatsapp_messages_today: 3,
    last_updated: '2026-07-17T09:00:00.000Z',
  };

  return {
    metrics,
    refreshMetrics: vi.fn(),
    useDashboardAnalytics: vi.fn(),
  };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'owner-1' }, loading: false }),
}));

vi.mock('@/contexts/CalendarContext', () => ({
  useCalendarContext: () => ({
    calendars: [{ id: 'calendar-1', name: 'Primary calendar' }],
    selectedCalendar: { id: 'calendar-1', name: 'Primary calendar' },
    viewingAllCalendars: false,
    getActiveCalendarIds: () => ['calendar-1'],
    loading: false,
  }),
}));

vi.mock('@/contexts/UserStatusContext', () => ({
  useUserStatus: () => ({
    userStatus: { isSetupIncomplete: false, userType: 'free' },
  }),
}));

vi.mock('@/hooks/useDashboardAnalytics', () => ({
  useDashboardAnalytics: testState.useDashboardAnalytics,
}));

vi.mock('@/hooks/dashboard/useNextAppointment', () => ({
  useNextAppointment: () => ({
    data: null,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/dashboard/usePopularService', () => ({
  usePopularService: () => ({
    data: null,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/dashboard/useWeeklyInsights', () => ({
  useWeeklyInsights: () => ({
    data: null,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useMockDataControl', () => ({
  useMockDataControl: () => ({ useMockData: false }),
}));

vi.mock('@/hooks/useAccessControl', () => ({
  useAccessControl: () => ({ checkAccess: () => true }),
}));

vi.mock('@/hooks/useScrollToTop', () => ({ useScrollToTop: vi.fn() }));
vi.mock('@/components/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/dashboard/CalendarManagement', () => ({
  CalendarManagement: () => <div>Calendar management</div>,
}));
vi.mock('@/components/ui/SubscriptionOverview', () => ({
  SubscriptionOverview: () => <div>Subscription overview</div>,
}));
vi.mock('@/components/CalendarSwitcher', () => ({ CalendarSwitcher: () => null }));
vi.mock('@/components/dashboard/DateRangeFilter', () => ({ DateRangeFilter: () => null }));
vi.mock('@/components/onboarding/OnboardingWizard', () => ({ OnboardingWizard: () => null }));
vi.mock('@/components/ui/SimplePageHeader', () => ({
  SimplePageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock('@/components/calendar-switcher/CreateCalendarDialog', () => ({
  CreateCalendarDialog: () => null,
}));
vi.mock('@/components/SubscriptionModal', () => ({ SubscriptionModal: () => null }));
vi.mock('@/components/dashboard-tabs/BusinessIntelligenceTab', () => ({
  BusinessIntelligenceTab: () => null,
}));
vi.mock('@/components/dashboard-tabs/PerformanceEfficiencyTab', () => ({
  PerformanceEfficiencyTab: () => null,
}));
vi.mock('@/components/dashboard-tabs/LiveOperationsTab', () => ({
  LiveOperationsTab: () => null,
}));
vi.mock('@/components/dashboard-tabs/FutureInsightsTab', () => ({
  FutureInsightsTab: () => null,
}));
vi.mock('@/components/dashboard-tabs/LockedTabPanel', () => ({
  LockedTabPanel: () => null,
}));

import Dashboard from './Dashboard';

describe('Dashboard overview route metrics wiring', () => {
  it('renders the canonical R44 metrics component through Dashboard -> OverviewTab', () => {
    testState.useDashboardAnalytics.mockReturnValue({
      metrics: testState.metrics,
      loading: false,
      error: null,
      refreshMetrics: testState.refreshMetrics,
      hasCalendar: true,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(testState.useDashboardAnalytics).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('region', { name: 'Current calendar metrics' })).toBeInTheDocument();
    expect(screen.getByText('Retained Revenue')).toBeInTheDocument();
    expect(screen.getByText('€145.00')).toBeInTheDocument();
    expect(screen.getByText('Contacts Later Booked')).toBeInTheDocument();
    expect(screen.queryByText('WhatsApp Conversion')).not.toBeInTheDocument();
  });
});
