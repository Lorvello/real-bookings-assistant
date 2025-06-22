
import React from 'react';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { YearView } from './YearView';
import { ViewType } from './CalendarContainer';

interface CalendarContentProps {
  currentView: ViewType;
  currentDate: Date;
  calendarId: string;
}

export function CalendarContent({ currentView, currentDate, calendarId }: CalendarContentProps) {
  return (
    <div className="h-full bg-gradient-to-br from-background/30 via-card/20 to-background/30 rounded-b-3xl overflow-hidden">
      <div className="h-full bg-card/60 backdrop-blur-sm border-t border-border/40">
        {currentView === 'month' && (
          <MonthView currentDate={currentDate} calendarId={calendarId} />
        )}
        
        {currentView === 'week' && (
          <WeekView currentDate={currentDate} calendarId={calendarId} />
        )}
        
        {currentView === 'year' && (
          <YearView currentDate={currentDate} calendarId={calendarId} />
        )}
      </div>
    </div>
  );
}
