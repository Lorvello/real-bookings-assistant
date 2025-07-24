import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { DashboardTabs } from '@/components/DashboardTabs';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { CalendarSelector } from '@/components/dashboard/CalendarSelector';
import { DateRange, getPresetRange } from '@/utils/dateRangePresets';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { UserStatusSwitcher } from '@/components/developer/UserStatusSwitcher';
import { SubscriptionTierSwitcher } from '@/components/developer/SubscriptionTierSwitcher';
import { CalendarSwitcherSection } from '@/components/dashboard/CalendarSwitcherSection';
import { SubscriptionOverview } from '@/components/ui/SubscriptionOverview';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { calendars, selectedCalendar, viewingAllCalendars, getActiveCalendarIds, loading: calendarsLoading } = useCalendarContext();
  const { userStatus } = useUserStatus();

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
        <div className="bg-gray-900 min-h-full p-2 md:p-8">
          {/* Developer Status Switcher */}
          <div className="mb-4">
            <UserStatusSwitcher />
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
      <div className="bg-gray-900 min-h-full p-2 md:p-8">
        {/* Developer Tools Section */}
        <div className="mb-4 space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <UserStatusSwitcher />
            <SubscriptionTierSwitcher />
          </div>
        </div>


        {/* Show Onboarding Wizard for Setup Incomplete Users */}
        {userStatus.isSetupIncomplete ? (
          <div className="space-y-6">
            <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl shadow-lg p-3 md:p-6">
              <h1 className="text-base md:text-3xl font-bold text-white mb-2">
                Welcome to your Dashboard
              </h1>
              <p className="text-gray-400 text-xs md:text-base">
                Let's get you set up so you can start receiving bookings
              </p>
            </div>
            <OnboardingWizard />
          </div>
        ) : (
          <>
            {/* Dashboard Header with Conditional Date Filter */}
            <div className="mb-4 md:mb-8">
              <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl shadow-lg p-3 md:p-6">
                <div className="flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0">
                  <div>
                    <h1 className="text-base md:text-3xl font-bold text-white">
                      Dashboard
                      <span className="hidden md:inline">
                        {viewingAllCalendars 
                          ? ' - All calendars'
                          : selectedCalendar 
                            ? ` - ${selectedCalendar.name}`
                            : ''
                        }
                      </span>
                    </h1>
                    <p className="text-gray-400 mt-1 text-xs md:text-base">
                      {viewingAllCalendars
                        ? `Overview of ${activeCalendarIds.length} calendars`
                        : 'Overview of your bookings and performance'
                      }
                    </p>
                  </div>
                  
                  {/* Calendar Selector and Date Filter */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <CalendarSelector />
                    {showDateFilter && (
                      <DateRangeFilter 
                        selectedRange={selectedDateRange}
                        onRangeChange={setSelectedDateRange}
                      />
                    )}
                  </div>
                </div>
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

            {/* Subscription Overview - Less prominent position */}
            <div className="mt-8">
              <SubscriptionOverview />
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
