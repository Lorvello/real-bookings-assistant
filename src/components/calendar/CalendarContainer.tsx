
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { addMonths, subMonths, addWeeks, subWeeks, addYears, subYears } from 'date-fns';
import { CalendarHeader } from './CalendarHeader';
import { CalendarContent } from './CalendarContent';
import { NewBookingModal } from '../NewBookingModal';
import { useMultipleCalendarBookings } from '@/hooks/useMultipleCalendarBookings';
import { useRealtimeBookings } from '@/hooks/useRealtimeBookings';

type CalendarView = 'month' | 'week' | 'year';

interface CalendarContainerProps {
  calendarIds: string[];
}

export function CalendarContainer({ calendarIds }: CalendarContainerProps) {
  console.log('CalendarContainer rendering with calendarIds:', calendarIds);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view') as CalendarView;
  
  const [currentView, setCurrentView] = useState<CalendarView>(
    viewParam && ['month', 'week', 'year'].includes(viewParam) ? viewParam : 'month'
  );
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  
  // Time range state for week view with business hours default
  const [timeRange, setTimeRange] = useState(() => {
    const saved = localStorage.getItem('calendar-time-range');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fall back to default if parsing fails
      }
    }
    return { startTime: '08:00', endTime: '18:00' };
  });
  
  const { bookings, loading, error, refetch } = useMultipleCalendarBookings(calendarIds);

  // Enable real-time updates voor alle kalenders - nu als één hook call
  useRealtimeBookings(calendarIds);

  // Update URL when view changes
  useEffect(() => {
    if (viewParam !== currentView) {
      const newSearchParams = new URLSearchParams(searchParams);
      if (currentView === 'month') {
        newSearchParams.delete('view');
      } else {
        newSearchParams.set('view', currentView);
      }
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [currentView, searchParams, setSearchParams, viewParam]);

  // Handle initial view from URL parameters
  useEffect(() => {
    if (viewParam && ['month', 'week', 'year'].includes(viewParam) && viewParam !== currentView) {
      setCurrentView(viewParam);
    }
  }, [viewParam]);

  const handleViewChange = (newView: CalendarView) => {
    setCurrentView(newView);
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

  const handleBookingCreated = () => {
    console.log('📅 Booking created, refreshing calendar data');
    refetch();
    setIsNewBookingModalOpen(false);
  };

  const handleNewBooking = () => {
    console.log('Opening new booking modal');
    setIsNewBookingModalOpen(true);
  };

  const handleModalClose = () => {
    setIsNewBookingModalOpen(false);
  };

  const handleTimeRangeChange = (startTime: string, endTime: string) => {
    const newTimeRange = { startTime, endTime };
    setTimeRange(newTimeRange);
    localStorage.setItem('calendar-time-range', JSON.stringify(newTimeRange));
  };

  // Save time range to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('calendar-time-range', JSON.stringify(timeRange));
  }, [timeRange]);

  return (
    <div className="bg-gradient-to-br from-card via-card/98 to-card/95 rounded-3xl border border-border/40 h-full flex flex-col overflow-hidden shadow-2xl shadow-black/10 backdrop-blur-xl">
      <CalendarHeader
        currentView={currentView}
        currentDate={currentDate}
        onViewChange={handleViewChange}
        onNavigate={navigateDate}
        onNewBooking={handleNewBooking}
        loading={loading}
        timeRange={timeRange}
        onTimeRangeChange={handleTimeRangeChange}
      />

      <div className="flex-1 overflow-hidden min-h-0 relative">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/[0.02] to-transparent pointer-events-none"></div>
        
        <div className="relative z-10 h-full">
          <CalendarContent
            currentView={currentView}
            bookings={bookings}
            currentDate={currentDate}
            loading={loading}
            error={error}
            timeRange={timeRange}
          />
        </div>
      </div>

      <NewBookingModal
        open={isNewBookingModalOpen}
        onClose={handleModalClose}
        calendarId={calendarIds[0] || ''} // Use first calendar for new bookings
        onBookingCreated={handleBookingCreated}
      />
    </div>
  );
}
