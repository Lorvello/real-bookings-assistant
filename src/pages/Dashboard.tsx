
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { DashboardTabs } from '@/components/DashboardTabs';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { calendars, selectedCalendar, viewingAllCalendars, getActiveCalendarIds, loading: calendarsLoading } = useCalendarContext();

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
        {/* Dashboard Header */}
        <div className="mb-8">
          <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl shadow-lg p-6">
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
        </div>

        {/* Dashboard Tabs */}
        {primaryCalendarId && (
          <DashboardTabs calendarId={primaryCalendarId} />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
