
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, addWeeks, subWeeks, addYears, subYears } from 'date-fns';
import { nl } from 'date-fns/locale';
import { MonthView } from './calendar/MonthView';
import { WeekView } from './calendar/WeekView';
import { YearView } from './calendar/YearView';
import { useBookings } from '@/hooks/useBookings';

type CalendarView = 'month' | 'week' | 'year';

interface CalendarViewProps {
  calendarId: string;
}

export function CalendarView({ calendarId }: CalendarViewProps) {
  const [currentView, setCurrentView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Use the new useBookings hook
  const { bookings, loading, error } = useBookings(calendarId);

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
        return format(currentDate, 'wo \'week van\' yyyy', { locale: nl });
      case 'month':
        return format(currentDate, 'MMMM yyyy', { locale: nl });
      case 'year':
        return format(currentDate, 'yyyy', { locale: nl });
      default:
        return format(currentDate, 'MMMM yyyy', { locale: nl });
    }
  };

  const renderCurrentView = () => {
    console.log('Rendering view:', currentView, 'with bookings:', bookings.length);
    
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Boekingen laden...</p>
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
  };

  if (error) {
    return (
      <div className="bg-card rounded-xl border border-border h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-2">⚠️</div>
          <p className="text-red-500 font-medium">Fout bij laden van boekingen</p>
          <p className="text-muted-foreground text-sm">{error}</p>
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
            onClick={() => {
              console.log('Switching to month view');
              setCurrentView('month');
            }}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              currentView === 'month'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            Maand
          </button>
          <button
            onClick={() => {
              console.log('Switching to week view');
              setCurrentView('week');
            }}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              currentView === 'week'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => {
              console.log('Switching to year view');
              setCurrentView('year');
            }}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              currentView === 'year'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            Jaar
          </button>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-hidden">
        {renderCurrentView()}
      </div>
    </div>
  );
}
