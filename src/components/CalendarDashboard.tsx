
import React from 'react';
import { CalendarView } from './CalendarView';
import { useCalendars } from '@/hooks/useCalendars';

export function CalendarDashboard() {
  const { calendars, loading } = useCalendars();
  const defaultCalendar = calendars.find(cal => cal.is_default) || calendars[0];

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!defaultCalendar) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-foreground mb-2">Geen kalender gevonden</h3>
          <p className="text-muted-foreground">Maak eerst een kalender aan om afspraken te bekijken.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <CalendarView calendarId={defaultCalendar.id} />
    </div>
  );
}
