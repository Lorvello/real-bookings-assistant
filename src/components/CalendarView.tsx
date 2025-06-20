
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, addWeeks, subWeeks, addMonths, subMonths, addYears, subYears } from 'date-fns';
import { nl } from 'date-fns/locale';
import { MonthView } from './calendar/MonthView';
import { WeekView } from './calendar/WeekView';
import { YearView } from './calendar/YearView';
import { useRealtimeCalendar } from '@/hooks/useRealtimeCalendar';

type CalendarView = 'year' | 'month' | 'week';

interface CalendarViewProps {
  calendarId: string;
}

export function CalendarView({ calendarId }: CalendarViewProps) {
  const [currentView, setCurrentView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Use real-time hook instead of local state
  const { bookings, isLoading, error, refetchData } = useRealtimeCalendar(calendarId);

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

  if (error) {
    return (
      <div className="bg-card rounded-xl border border-border h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-medium text-foreground mb-2">Fout bij laden</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={refetchData}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
            >
              Opnieuw proberen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border h-full flex flex-col">
      {/* Calendar Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center space-x-4">
          {/* Navigation */}
          <button
            onClick={() => navigateDate('prev')}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            disabled={isLoading}
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          
          <h2 className="text-xl font-semibold text-foreground capitalize">
            {formatDateHeader()}
          </h2>
          
          <button
            onClick={() => navigateDate('next')}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            disabled={isLoading}
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
        {isLoading ? (
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
