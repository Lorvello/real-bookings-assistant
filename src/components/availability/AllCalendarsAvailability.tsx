import React from 'react';
import { Calendar as CalendarIcon, ChevronRight } from 'lucide-react';
import { useCalendarAvailabilitySummary } from '@/hooks/useCalendarAvailabilitySummary';
import { useCalendarContext } from '@/contexts/CalendarContext';
import type { Calendar } from '@/types/database';

interface AllCalendarsAvailabilityProps {
  calendars: Calendar[];
}

export const AllCalendarsAvailability: React.FC<AllCalendarsAvailabilityProps> = ({ calendars }) => {
  const { selectCalendar } = useCalendarContext();
  const { summaries, isLoading } = useCalendarAvailabilitySummary(calendars);

  const formatTime = (time: string | null) => {
    if (!time) return null;
    return time.slice(0, 5);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 bg-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (calendars.length === 0) {
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-lg p-8">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-foreground">No Calendars</h2>
          <p className="text-muted-foreground">Create a calendar to set up availability.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Click on a calendar to view and edit its availability settings.
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {summaries.map((summary) => {
          const calendar = calendars.find(c => c.id === summary.calendarId);
          if (!calendar) return null;

          return (
            <button
              key={summary.calendarId}
              onClick={() => selectCalendar(calendar)}
              className="bg-card/95 backdrop-blur-sm border border-border/60 hover:border-primary/50 shadow-lg rounded-lg p-4 text-left transition-all hover:shadow-xl group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: summary.calendarColor || 'hsl(var(--primary))' }}
                  />
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-semibold text-foreground truncate max-w-[180px]">
                      {summary.calendarName}
                    </h3>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>

              <div className="space-y-1">
                {summary.days.map((day) => (
                  <div 
                    key={day.dayOfWeek} 
                    className="flex items-center justify-between text-sm"
                  >
                    <span className={`w-10 ${day.isAvailable ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {day.dayName}
                    </span>
                    {day.isAvailable ? (
                      <span className="text-muted-foreground">
                        {formatTime(day.startTime)} - {formatTime(day.endTime)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50 italic">Closed</span>
                    )}
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
