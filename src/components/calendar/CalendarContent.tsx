
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModernMonthView } from './ModernMonthView';
import { WeekView } from './WeekView';
import { YearView } from './YearView';

type CalendarView = 'month' | 'week' | 'year';

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  customer_phone?: string;
  status: string;
  service_types?: {
    name: string;
    color: string;
    duration: number;
  } | null;
}

interface CalendarContentProps {
  currentView: CalendarView;
  bookings: Booking[];
  currentDate: Date;
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  timeRange?: { startTime: string; endTime: string };
  viewingAllCalendars?: boolean;
}

export const CalendarContent = React.memo(function CalendarContent({
  currentView,
  bookings,
  currentDate,
  loading,
  error,
  onRetry,
  timeRange,
  viewingAllCalendars = false
}: CalendarContentProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
            <div className="absolute inset-0 w-12 h-12 border-4 border-primary/10 rounded-full mx-auto"></div>
          </div>
          <p className="text-muted-foreground font-medium">Loading bookings...</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Please wait</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-5 w-5 text-destructive-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">Couldn't load your bookings</p>
          <p className="max-w-xs text-xs text-subtle-foreground">{error}</p>
          {onRetry && (
            <Button variant="secondary" size="sm" onClick={onRetry} className="mt-1 gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  switch (currentView) {
    case 'month':
      return <ModernMonthView bookings={bookings} currentDate={currentDate} viewingAllCalendars={viewingAllCalendars} />;
    case 'week':
      return <WeekView bookings={bookings} currentDate={currentDate} timeRange={timeRange} viewingAllCalendars={viewingAllCalendars} />;
    case 'year':
      return <YearView bookings={bookings} currentDate={currentDate} viewingAllCalendars={viewingAllCalendars} />;
    default:
      return <ModernMonthView bookings={bookings} currentDate={currentDate} viewingAllCalendars={viewingAllCalendars} />;
  }
});
