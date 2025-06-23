
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { DashboardBackground } from '@/components/dashboard/DashboardBackground';
import { DashboardLoadingScreen } from '@/components/dashboard/DashboardLoadingScreen';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
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
        <DashboardBackground>
          <DashboardLoadingScreen />
        </DashboardBackground>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }

  if (calendars.length === 0) {
    return (
      <DashboardLayout>
        <DashboardBackground>
          <DashboardEmptyState />
        </DashboardBackground>
      </DashboardLayout>
    );
  }

  const activeCalendarIds = getActiveCalendarIds();
  const primaryCalendarId = activeCalendarIds.length > 0 ? activeCalendarIds[0] : undefined;

  return (
    <DashboardLayout>
      <DashboardBackground>
        <div className="space-y-8 p-8">
          {/* Dashboard Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-green-100 to-green-200 bg-clip-text text-transparent mb-4">
              Dashboard
              {viewingAllCalendars 
                ? ' - Alle kalenders'
                : selectedCalendar 
                  ? ` - ${selectedCalendar.name}`
                  : ''
              }
            </h1>
            <p className="text-gray-400 text-lg">
              {viewingAllCalendars
                ? `Overzicht van ${activeCalendarIds.length} kalenders`
                : 'Overzicht van je boekingen en prestaties'
              }
            </p>
          </div>

          {/* Dashboard Tabs */}
          {primaryCalendarId && (
            <DashboardTabs calendarId={primaryCalendarId} />
          )}
        </div>
      </DashboardBackground>
    </DashboardLayout>
  );
};

export default Dashboard;
