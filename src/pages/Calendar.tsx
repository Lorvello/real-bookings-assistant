
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { CalendarView } from '@/components/CalendarView';
import { useAuth } from '@/hooks/useAuth';
import { useCalendars } from '@/hooks/useCalendars';

const Calendar = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { calendars, loading: calendarsLoading } = useCalendars();

  const defaultCalendar = calendars.find(cal => cal.is_default) || calendars[0];

  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || calendarsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full min-h-screen bg-gradient-to-br from-background via-card to-background/95">
          <div className="text-center bg-card/90 backdrop-blur-sm border border-border/60 rounded-3xl p-8 shadow-lg shadow-black/5">
            <div className="w-8 h-8 bg-primary rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg text-foreground">Kalender laden...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }

  if (!defaultCalendar) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full min-h-screen bg-gradient-to-br from-background via-card to-background/95">
          <div className="text-center bg-card/90 backdrop-blur-sm border border-border/60 rounded-3xl p-8 shadow-lg shadow-black/5">
            <div className="text-lg text-foreground">Geen kalender gevonden</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-full bg-gradient-to-br from-background via-card to-background/95">
        <div className="h-full bg-card/90 backdrop-blur-sm border border-border/60 rounded-3xl m-6 shadow-lg shadow-black/5 overflow-hidden">
          <CalendarView calendarId={defaultCalendar.id} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Calendar;
