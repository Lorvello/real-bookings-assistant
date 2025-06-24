
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
}

export function CalendarContent({
  currentView,
  bookings,
  currentDate,
  loading,
  error
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
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center bg-gradient-to-br from-red-500/10 to-red-500/5 rounded-3xl p-8 border border-red-500/20">
          <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-xl">⚠️</span>
          </div>
          <p className="text-red-500 font-semibold mb-2">Error loading bookings</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  switch (currentView) {
    case 'month':
      return <ModernMonthView bookings={bookings} currentDate={currentDate} />;
    case 'week':
      return <WeekView bookings={bookings} currentDate={currentDate} />;
    case 'year':
      return <YearView bookings={bookings} currentDate={currentDate} />;
    default:
      return <ModernMonthView bookings={bookings} currentDate={currentDate} />;
  }
}
