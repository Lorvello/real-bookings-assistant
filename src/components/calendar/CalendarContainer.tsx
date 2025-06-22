
import React, { useState } from 'react';
import { CalendarHeader } from './CalendarHeader';
import { CalendarContent } from './CalendarContent';

export type ViewType = 'month' | 'week' | 'year';

interface CalendarContainerProps {
  calendarId: string;
}

export function CalendarContainer({ calendarId }: CalendarContainerProps) {
  const [currentView, setCurrentView] = useState<ViewType>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-card/90 via-background/60 to-card/80 backdrop-blur-sm rounded-3xl overflow-hidden">
      {/* Calendar Header */}
      <div className="flex-shrink-0 bg-card/95 backdrop-blur-sm border-b border-border/60 rounded-t-3xl shadow-sm">
        <CalendarHeader
          currentView={currentView}
          currentDate={currentDate}
          onViewChange={setCurrentView}
          onDateChange={setCurrentDate}
        />
      </div>
      
      {/* Calendar Content */}
      <div className="flex-1 overflow-hidden">
        <CalendarContent
          currentView={currentView}
          currentDate={currentDate}
          calendarId={calendarId}
        />
      </div>
    </div>
  );
}
