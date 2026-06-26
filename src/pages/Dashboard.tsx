import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { DashboardTabs } from '@/components/DashboardTabs';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { CalendarSwitcher } from '@/components/CalendarSwitcher';
import { DateRange, getPresetRange } from '@/utils/dateRangePresets';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { CalendarSwitcherSection } from '@/components/dashboard/CalendarSwitcherSection';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';
import { CreateCalendarDialog } from '@/components/calendar-switcher/CreateCalendarDialog';
import { Button } from '@/components/ui/button';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');
  const { user, loading: authLoading } = useAuth();
  const { calendars, selectedCalendar, viewingAllCalendars, getActiveCalendarIds, loading: calendarsLoading } = useCalendarContext();
  const { userStatus } = useUserStatus();
  
  // Auto scroll to top on route changes
  useScrollToTop();

  // Handle post-payment refresh
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const fromPayment = urlParams.get('from');
    
    if (fromPayment === 'payment-success') {
      console.log('Detected payment success, refreshing page in 500ms to sync subscription benefits...');
      setTimeout(() => {
        // Clean up URL and refresh
        window.history.replaceState({}, '', window.location.pathname);
        window.location.reload();
      }, 500);
    }
  }, []);

  // Date range state for the dashboard
  const [selectedDateRange, setSelectedDateRange] = React.useState<DateRange>(() => {
    try {
      return getPresetRange('last30days');
    } catch (error) {
      console.error('Error getting preset range, using default:', error);
      const now = new Date();
      const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      return {
        startDate,
        endDate,
        preset: 'last30days',
        label: 'Last 30 days'
      };
    }
  });

  // Track active tab to show date filter conditionally
  const [activeTab, setActiveTab] = React.useState('overview');

  // Create-calendar dialog for the no-calendar empty state (a new owner must be able
  // to create one straight from the dashboard, not hit a dead-end).
  const [createCalendarOpen, setCreateCalendarOpen] = React.useState(false);

  // Show date filter only for business intelligence and performance efficiency tabs
  const showDateFilter = activeTab === 'business-intelligence' || activeTab === 'performance-efficiency';

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Only show loading skeleton on INITIAL page load
  if (authLoading || calendarsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full bg-background">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }

  const activeCalendarIds = getActiveCalendarIds();
  const primaryCalendarId = activeCalendarIds.length > 0 ? activeCalendarIds[0] : undefined;

  // Show "No calendar found" only for non-setup-incomplete users
  if (!userStatus.isSetupIncomplete && calendars.length === 0) {
    return (
      <DashboardLayout>
        <div className="bg-background min-h-0 p-3 sm:p-4 md:p-8 pb-6 sm:pb-8 md:pb-12">
          <SimplePageHeader title={t('dashboard.title', 'Dashboard')} />
          <div className="mt-4 surface-raised rounded-xl p-8">
            <div className="text-center space-y-6">
              <div className="glow-accent relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                <CalendarIcon aria-hidden="true" className="h-6 w-6 text-accent-foreground" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">{t('dashboard.emptyTitle', 'Create your first calendar')}</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {t('dashboard.emptyDesc', 'You need a calendar before your dashboard can show bookings and insights. Create one to get started.')}
                </p>
              </div>
              <Button onClick={() => setCreateCalendarOpen(true)} size="lg" className="gap-2">
                <Plus aria-hidden="true" className="h-4 w-4" />
                {t('dashboard.createCalendar', 'Create calendar')}
              </Button>
            </div>
          </div>
        </div>

        <CreateCalendarDialog open={createCalendarOpen} onOpenChange={setCreateCalendarOpen} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="bg-background min-h-0 p-1 sm:p-1.5 md:p-8 pb-2 sm:pb-4 md:pb-12">
        {/* Developer tools moved to a collapsed floating panel (DeveloperOverlay) so
            they never cover the real dashboard. */}

        {/* Show Onboarding Wizard for Setup Incomplete Users */}
        {userStatus.isSetupIncomplete ? (
          <div className="space-y-4 sm:space-y-6">
            <SimplePageHeader title={t('dashboard.welcomeTitle', 'Welcome to your Dashboard')} />
            <OnboardingWizard />
          </div>
        ) : (
          <>
            <SimplePageHeader title={t('dashboard.title', 'Dashboard')} />

            {/* Calendar Switcher and Date Filter */}
            <div className="mb-1 sm:mb-2 md:mb-6">
              <div className="space-y-1 sm:space-y-2">
                <CalendarSwitcher />
                {showDateFilter && (
                  <DateRangeFilter 
                    selectedRange={selectedDateRange}
                    onRangeChange={setSelectedDateRange}
                  />
                )}
              </div>
            </div>

            {/* Dashboard Tabs */}
            {activeCalendarIds.length > 0 && (
              <DashboardTabs 
                calendarIds={activeCalendarIds}
                dateRange={selectedDateRange}
                onTabChange={setActiveTab}
              />
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
