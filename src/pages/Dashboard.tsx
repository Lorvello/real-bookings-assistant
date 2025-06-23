
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { DashboardBackground } from '@/components/dashboard/DashboardBackground';
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
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 bg-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg text-gray-300">Loading...</div>
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
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg text-gray-300">Geen kalender gevonden</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const activeCalendarIds = getActiveCalendarIds();
  const primaryCalendarId = activeCalendarIds.length > 0 ? activeCalendarIds[0] : undefined;

  return (
    <DashboardLayout>
      <DashboardBackground>
        <div className="min-h-screen bg-gray-900 p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">
              Dashboard
              {viewingAllCalendars 
                ? ' - Alle kalenders'
                : selectedCalendar 
                  ? ` - ${selectedCalendar.name}`
                  : ''
              }
            </h1>
            <p className="text-gray-400 mt-1">
              {viewingAllCalendars
                ? `Overzicht van ${activeCalendarIds.length} kalenders`
                : 'Overzicht van je boekingen en prestaties'
              }
            </p>
          </div>

          {/* Dashboard Tabs */}
          <div className="max-w-7xl">
            {primaryCalendarId && (
              <DashboardTabs calendarId={primaryCalendarId} />
            )}
          </div>
        </div>
      </DashboardBackground>
    </DashboardLayout>
  );
};

export default Dashboard;
