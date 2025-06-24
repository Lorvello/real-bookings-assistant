
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { DashboardTabs } from '@/components/DashboardTabs';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { DateRange, getPresetRange } from '@/utils/dateRangePresets';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { calendars, selectedCalendar, viewingAllCalendars, getActiveCalendarIds, loading: calendarsLoading } = useCalendarContext();

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

  if (calendars.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full bg-gray-900">
          <div className="text-center">
            <div className="text-lg text-gray-300">No calendar found</div>
            <p className="text-gray-500 mt-2">Create your first calendar to get started</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const activeCalendarIds = getActiveCalendarIds();
  const primaryCalendarId = activeCalendarIds.length > 0 ? activeCalendarIds[0] : undefined;

  return (
    <DashboardLayout>
      <div className="bg-gray-900 min-h-full p-8">
        {/* Dashboard Header with Conditional Date Filter */}
        <div className="mb-8">
          <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Dashboard
                  {viewingAllCalendars 
                    ? ' - All calendars'
                    : selectedCalendar 
                      ? ` - ${selectedCalendar.name}`
                      : ''
                  }
                </h1>
                <p className="text-gray-400 mt-1">
                  {viewingAllCalendars
                    ? `Overview of ${activeCalendarIds.length} calendars`
                    : 'Overview of your bookings and performance'
                  }
                </p>
              </div>
              
              {/* Conditional Date Filter in Header */}
              {showDateFilter && (
                <div className="flex-shrink-0">
                  <DateRangeFilter 
                    selectedRange={selectedDateRange}
                    onRangeChange={setSelectedDateRange}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dashboard Tabs */}
        {primaryCalendarId && (
          <DashboardTabs 
            calendarId={primaryCalendarId} 
            dateRange={selectedDateRange}
            onTabChange={setActiveTab}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
