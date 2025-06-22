
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { DashboardBackground } from '@/components/dashboard/DashboardBackground';
import { DashboardLoadingScreen } from '@/components/dashboard/DashboardLoadingScreen';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import { DashboardContent } from '@/components/dashboard/DashboardContent';

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
  const displayCalendarName = viewingAllCalendars 
    ? 'Alle kalenders' 
    : selectedCalendar?.name || 'Kalender';

  return (
    <DashboardLayout>
      <DashboardBackground>
        <DashboardContent 
          calendarIds={activeCalendarIds}
          calendarName={displayCalendarName} 
        />
      </DashboardBackground>
    </DashboardLayout>
  );
};

export default Dashboard;
