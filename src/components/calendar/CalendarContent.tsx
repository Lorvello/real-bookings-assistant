
import { MonthView } from './MonthView';
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Boekingen laden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 mb-2">⚠️</div>
          <p className="text-red-500 font-medium">Fout bij laden van boekingen</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  switch (currentView) {
    case 'month':
      return <MonthView bookings={bookings} currentDate={currentDate} />;
    case 'week':
      return <WeekView bookings={bookings} currentDate={currentDate} />;
    case 'year':
      return <YearView bookings={bookings} currentDate={currentDate} />;
    default:
      return <MonthView bookings={bookings} currentDate={currentDate} />;
  }
}
