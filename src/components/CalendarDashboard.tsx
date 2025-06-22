
import React from 'react';
import { CalendarView } from './CalendarView';

interface CalendarDashboardProps {
  calendarIds: string[];
}

export function CalendarDashboard({ calendarIds }: CalendarDashboardProps) {
  if (calendarIds.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-foreground mb-2">Geen kalenders geselecteerd</h3>
          <p className="text-muted-foreground">Selecteer een kalender om afspraken te bekijken.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <CalendarView calendarIds={calendarIds} />
    </div>
  );
}
