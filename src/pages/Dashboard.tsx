
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useCalendars } from '@/hooks/useCalendars';
import { DashboardBackground } from '@/components/dashboard/DashboardBackground';
import { DashboardLoadingScreen } from '@/components/dashboard/DashboardLoadingScreen';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import { DashboardContent } from '@/components/dashboard/DashboardContent';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { calendars, loading: calendarsLoading } = useCalendars();

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

  const activeCalendar = calendars.find(cal => cal.is_active) || calendars[0];

  if (!activeCalendar) {
    return (
      <DashboardLayout>
        <DashboardBackground>
          <DashboardEmptyState />
        </DashboardBackground>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardBackground>
        <DashboardContent 
          calendarId={activeCalendar.id} 
          calendarName={activeCalendar.name} 
        />
      </DashboardBackground>
    </DashboardLayout>
  );
};

export default Dashboard;
