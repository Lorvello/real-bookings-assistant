
import React, { useEffect } from 'react';
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
            <div className="text-lg text-gray-300">Kalender laden...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="h-full bg-gray-900 p-6">
        <div className="h-full">
          <CalendarView calendarId={defaultCalendar?.id} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Calendar;
