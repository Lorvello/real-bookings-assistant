
import React from 'react';
import { CalendarSwitcher } from '@/components/CalendarSwitcher';
import { useCalendarContext } from '@/contexts/CalendarContext';

export function BookingsHeader() {
  const { selectedCalendar, viewingAllCalendars, calendars } = useCalendarContext();
  
  const displayTitle = viewingAllCalendars 
    ? 'All calendars' 
    : selectedCalendar?.name || 'My Bookings';

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm p-3 md:p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-lg md:text-3xl font-semibold text-foreground">{displayTitle}</h1>
          <p className="text-muted-foreground mt-1 text-xs md:text-base">
            {viewingAllCalendars 
              ? `View bookings from ${calendars.length} calendars`
              : 'Overview of all your appointments'
            }
          </p>
        </div>
        
        <div className="flex-shrink-0">
          <CalendarSwitcher />
        </div>
      </div>
    </div>
  );
}
