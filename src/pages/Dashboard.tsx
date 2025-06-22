
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useCalendars } from '@/hooks/useCalendars';
import { DashboardTabs } from '@/components/DashboardTabs';

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
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-8 h-8 bg-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg text-gray-300">Dashboard laden...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }

  // Get the first active calendar for now
  const activeCalendar = calendars.find(cal => cal.is_active) || calendars[0];

  if (!activeCalendar) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-lg text-gray-600 mb-4">Geen kalender gevonden</div>
            <div className="text-sm text-gray-500">Maak eerst een kalender aan om het dashboard te gebruiken</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-card via-card/90 to-card rounded-xl p-6 border border-border/40 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Dashboard
              </h1>
              <p className="text-muted-foreground">
                Overzicht van je boekingen en statistieken voor <span className="font-medium text-foreground">{activeCalendar.name}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Actieve kalender</div>
                <div className="font-medium text-foreground">{activeCalendar.name}</div>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Dashboard Tabs */}
        <DashboardTabs calendarId={activeCalendar.id} />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
