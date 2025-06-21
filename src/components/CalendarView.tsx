
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, addWeeks, subWeeks, addMonths, subMonths, addYears, subYears, eachDayOfInterval, isSameMonth, isSameDay, startOfDay } from 'date-fns';
import { nl } from 'date-fns/locale';
import { MonthView } from './calendar/MonthView';
import { WeekView } from './calendar/WeekView';
import { YearView } from './calendar/YearView';

type CalendarView = 'year' | 'month' | 'week';

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  customer_phone: string | null;
  status: string;
  service_type_id: string | null;
  service_types?: {
    name: string;
    color: string;
    duration: number;
  } | null;
}

interface CalendarViewProps {
  calendarId: string;
}

export function CalendarView({ calendarId }: CalendarViewProps) {
  const [currentView, setCurrentView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time subscription
  useEffect(() => {
    if (!calendarId) return;

    // Fetch initial bookings
    fetchBookings();

    // Subscribe to changes
    const channel = supabase
      .channel('bookings_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `calendar_id=eq.${calendarId}`,
        },
        (payload) => {
          console.log('Real-time booking update:', payload);
          fetchBookings(); // Refresh bookings
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [calendarId, currentDate, currentView]);

  const getStartDate = () => {
    switch (currentView) {
      case 'week':
        return startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
      case 'month':
        return startOfMonth(currentDate);
      case 'year':
        return startOfYear(currentDate);
      default:
        return startOfMonth(currentDate);
    }
  };

  const getEndDate = () => {
    switch (currentView) {
      case 'week':
        return endOfWeek(currentDate, { weekStartsOn: 1 });
      case 'month':
        return endOfMonth(currentDate);
      case 'year':
        return endOfYear(currentDate);
      default:
        return endOfMonth(currentDate);
    }
  };

  const fetchBookings = async () => {
    if (!calendarId) return;

    setLoading(true);
    try {
      const startDate = getStartDate();
      const endDate = getEndDate();

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          start_time,
          end_time,
          customer_name,
          customer_phone,
          status,
          service_type_id,
          service_types (
            name,
            color,
            duration
          )
        `)
        .eq('calendar_id', calendarId)
        .gte('start_time', startDate.toISOString())
        .lte('end_time', endDate.toISOString())
        .neq('status', 'cancelled');

      if (error) {
        console.error('Error fetching bookings:', error);
      } else {
        setBookings(data || []);
      }
    } catch (error) {
      console.error('Error in fetchBookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      switch (currentView) {
        case 'week':
          return direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1);
        case 'month':
          return direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1);
        case 'year':
          return direction === 'next' ? addYears(prev, 1) : subYears(prev, 1);
        default:
          return prev;
      }
    });
  };

  const formatDateHeader = () => {
    switch (currentView) {
      case 'week':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(weekStart, 'd MMM', { locale: nl })} - ${format(weekEnd, 'd MMM yyyy', { locale: nl })}`;
      case 'month':
        return format(currentDate, 'MMMM yyyy', { locale: nl });
      case 'year':
        return format(currentDate, 'yyyy', { locale: nl });
      default:
        return format(currentDate, 'MMMM yyyy', { locale: nl });
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border h-full flex flex-col">
      {/* Calendar Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center space-x-4">
          {/* Navigation */}
          <button
            onClick={() => navigateDate('prev')}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            disabled={loading}
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          
          <h2 className="text-xl font-semibold text-foreground capitalize">
            {formatDateHeader()}
          </h2>
          
          <button
            onClick={() => navigateDate('next')}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            disabled={loading}
          >
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* View Switcher */}
        <div className="flex bg-muted rounded-lg p-1">
          <button
            onClick={() => setCurrentView('week')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              currentView === 'week'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setCurrentView('month')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              currentView === 'month'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Maand
          </button>
          <button
            onClick={() => setCurrentView('year')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              currentView === 'year'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Jaar
          </button>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {currentView === 'month' && <MonthView bookings={bookings} currentDate={currentDate} />}
            {currentView === 'week' && <WeekView bookings={bookings} currentDate={currentDate} />}
            {currentView === 'year' && <YearView bookings={bookings} currentDate={currentDate} />}
          </>
        )}
      </div>
    </div>
  );
}
