import React from 'react';
import { useNavigate } from 'react-router-dom';
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
import { DeveloperStatusManager } from '@/components/developer/DeveloperStatusManager';
import { StripeModeSwitcher } from '@/components/developer/StripeModeSwitcher';
import { CalendarSwitcherSection } from '@/components/dashboard/CalendarSwitcherSection';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { calendars, selectedCalendar, viewingAllCalendars, getActiveCalendarIds, loading: calendarsLoading } = useCalendarContext();
  const { userStatus } = useUserStatus();
  
  // Auto scroll to top on route changes
  useScrollToTop();

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

  // Show date filter only for business intelligence and performance efficiency tabs
  const showDateFilter = activeTab === 'business-intelligence' || activeTab === 'performance-efficiency';

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || calendarsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full bg-gray-900">
          <div className="text-center">
            <div className="w-8 h-8 bg-cyan-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg text-gray-300">Loading Dashboard...</div>
          </div>
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
        <div className="bg-gray-900 min-h-0 p-3 sm:p-4 md:p-8 pb-6 sm:pb-8 md:pb-12">
          {/* Developer Tools Section */}
          <div className="mb-4 space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <DeveloperStatusManager />
              <StripeModeSwitcher />
            </div>
          </div>

          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-lg text-gray-300">No calendar found</div>
              <p className="text-gray-500 mt-2">Create your first calendar to get started</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="bg-gray-900 min-h-0 p-3 sm:p-4 md:p-8 pb-6 sm:pb-8 md:pb-12">
        {/* Developer Tools Section */}
        <div className="mb-4 space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <DeveloperStatusManager />
            <StripeModeSwitcher />
          </div>
        </div>


        {/* Show Onboarding Wizard for Setup Incomplete Users */}
        {userStatus.isSetupIncomplete ? (
          <div className="space-y-4 sm:space-y-6">
            <SimplePageHeader title="Welcome to your Dashboard" />
            <OnboardingWizard />
          </div>
        ) : (
          <>
            <SimplePageHeader title="Dashboard" />
            
            {/* Calendar Switcher and Date Filter */}
            <div className="mb-4 sm:mb-6">
              <div className="space-y-2 sm:space-y-3">
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
