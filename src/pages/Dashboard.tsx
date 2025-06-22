
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
        <div className="flex items-center justify-center h-full min-h-screen">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
              <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-r-primary/40 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <div className="space-y-2">
              <div className="text-xl font-semibold text-foreground">Dashboard laden...</div>
              <div className="text-sm text-muted-foreground">Een moment geduld</div>
            </div>
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
        <div className="flex items-center justify-center h-full min-h-screen">
          <div className="text-center space-y-6 max-w-md mx-auto">
            <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center mx-auto">
              <div className="w-10 h-10 bg-primary/10 rounded-xl"></div>
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-foreground">Geen kalender gevonden</h3>
              <p className="text-muted-foreground">Maak eerst een kalender aan om het dashboard te gebruiken</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        {/* Futuristic Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_49%,rgba(16,185,129,0.03)_50%,rgba(16,185,129,0.03)_51%,transparent_52%)] bg-[length:20px_20px]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(-45deg,transparent_49%,rgba(16,185,129,0.02)_50%,rgba(16,185,129,0.02)_51%,transparent_52%)] bg-[length:20px_20px]"></div>
        </div>

        <div className="relative z-10 p-8 space-y-8">
          {/* Header met futuristic design */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 rounded-3xl blur-xl"></div>
            <div className="relative bg-card/80 backdrop-blur-xl rounded-3xl p-8 border border-border/50 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                      Dashboard
                    </h1>
                    <div className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full border border-primary/20">
                      Live
                    </div>
                  </div>
                  <p className="text-muted-foreground text-lg">
                    Overzicht van je boekingen en statistieken voor{' '}
                    <span className="font-semibold text-foreground">{activeCalendar.name}</span>
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right space-y-1">
                    <div className="text-sm text-muted-foreground">Actieve kalender</div>
                    <div className="font-semibold text-foreground text-lg">{activeCalendar.name}</div>
                  </div>
                  <div className="relative">
                    <div className="w-4 h-4 bg-primary rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 w-4 h-4 bg-primary rounded-full animate-ping opacity-75"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard Tabs met futuristic styling */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent rounded-3xl blur-2xl"></div>
            <div className="relative">
              <DashboardTabs calendarId={activeCalendar.id} />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
