
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
        <div className="flex items-center justify-center h-full bg-gray-900">
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
        <div className="flex items-center justify-center h-full bg-gray-900">
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
      <div className="bg-gray-900 min-h-full p-6">
        {/* Calendar Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">{displayTitle}</h1>
            <p className="text-gray-400 mt-1">
              {viewingAllCalendars 
                ? `Beheer afspraken van ${calendars.length} kalenders`
                : 'Beheer je afspraken en beschikbaarheid'
              }
            </p>
          </div>
          
          {/* Calendar Switcher */}
          <CalendarSwitcher />
        </div>

        {/* Calendar Content with Clean Styling */}
        <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-6">
          <CalendarView calendarIds={activeCalendarIds} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Calendar;
