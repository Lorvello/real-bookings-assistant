
import React, { useState } from 'react';
import { CalendarContainer } from './calendar/CalendarContainer';
import { AvailabilityPanel } from './AvailabilityPanel';

interface CalendarViewProps {
  calendarId: string;
}

export function CalendarView({ calendarId }: CalendarViewProps) {
  return (
    <div className="relative h-full bg-gradient-to-br from-background/50 via-card/30 to-background/50 rounded-3xl overflow-hidden">
      {/* Main Calendar Content */}
      <div className="h-full bg-card/80 backdrop-blur-sm rounded-3xl border border-border/40 shadow-inner">
        <CalendarContainer calendarId={calendarId} />
      </div>
      
      {/* Availability Panel Overlay */}
      <AvailabilityPanel calendarId={calendarId} />
    </div>
  );
}
