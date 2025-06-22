
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { CalendarView } from '@/components/CalendarView';
import { CalendarSwitcher } from '@/components/CalendarSwitcher';
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
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-8 h-8 bg-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg text-gray-300">Kalender laden...</div>
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
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-lg text-gray-300">Geen kalender gevonden</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        {/* Calendar Header met Switcher */}
        <div className="flex-shrink-0 p-4 border-b border-border bg-card/50">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-1">Kalender</h1>
              <p className="text-sm text-muted-foreground">
                Beheer je afspraken en beschikbaarheid
              </p>
            </div>
            
            {/* Calendar Switcher - nu prominent zichtbaar */}
            <CalendarSwitcher />
          </div>
        </div>

        {/* Calendar Content */}
        <div className="flex-1 p-6 min-h-0">
          <CalendarView calendarId={defaultCalendar.id} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Calendar;
