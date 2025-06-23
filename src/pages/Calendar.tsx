
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { CalendarView } from '@/components/CalendarView';
import { CalendarSwitcher } from '@/components/CalendarSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useCalendarContext } from '@/contexts/CalendarContext';

const Calendar = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { selectedCalendar, calendars, viewingAllCalendars, getActiveCalendarIds, loading: calendarsLoading } = useCalendarContext();

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

  if (calendars.length === 0) {
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

  const activeCalendarIds = getActiveCalendarIds();
  const displayTitle = viewingAllCalendars 
    ? 'Alle kalenders' 
    : selectedCalendar?.name || 'Kalender';

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        {/* Calendar Header met Switcher */}
        <div className="flex-shrink-0 p-4 border-b border-border bg-card/50">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-1">{displayTitle}</h1>
              <p className="text-sm text-muted-foreground">
                {viewingAllCalendars 
                  ? `Beheer afspraken van ${calendars.length} kalenders`
                  : 'Beheer je afspraken en beschikbaarheid'
                }
              </p>
            </div>
            
            {/* Calendar Switcher - nu prominent zichtbaar */}
            <CalendarSwitcher />
          </div>
        </div>

        {/* Calendar Content */}
        <div className="flex-1 p-6 min-h-0">
          <CalendarView calendarIds={activeCalendarIds} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Calendar;
