
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, addYears, subYears, addWeeks, subWeeks } from 'date-fns';
import { nl } from 'date-fns/locale';
import { MonthView } from './calendar/MonthView';
import { WeekView } from './calendar/WeekView';
import { YearView } from './calendar/YearView';
import { useCalendars } from '@/hooks/useCalendars';

type CalendarView = 'year' | 'month' | 'week';

interface CalendarViewProps {
  calendarId?: string;
}

export function CalendarView({ calendarId }: CalendarViewProps) {
  const [currentView, setCurrentView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const { calendars, loading } = useCalendars();
  
  // Voor nu gebruiken we een dummy company_id, later kan dit komen van de calendar of user context
  const companyId = calendarId || 'default-company-id';

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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          
          <h2 className="text-xl font-semibold text-foreground capitalize">
            {formatDateHeader()}
          </h2>
          
          <button
            onClick={() => navigateDate('next')}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
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
      <div className="flex-1 overflow-hidden p-4">
        {currentView === 'month' && <MonthView currentDate={currentDate} companyId={companyId} />}
        {currentView === 'week' && <WeekView bookings={[]} currentDate={currentDate} />}
        {currentView === 'year' && <YearView bookings={[]} currentDate={currentDate} />}
      </div>
    </div>
  );
}
