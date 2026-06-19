
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { addMonths, subMonths, addWeeks, subWeeks, addYears, subYears } from 'date-fns';
import { CalendarHeader } from './CalendarHeader';
import { CalendarContent } from './CalendarContent';
import { NewBookingModal } from '../NewBookingModal';
import { AppointmentUpgradeModal } from './AppointmentUpgradeModal';
import { useMultipleCalendarBookings } from '@/hooks/useMultipleCalendarBookings';
import { useRealtimeBookings } from '@/hooks/useRealtimeBookings';
import { useAccessControl } from '@/hooks/useAccessControl';

type CalendarView = 'month' | 'week' | 'year';

interface CalendarContainerProps {
  calendarIds: string[];
  viewingAllCalendars?: boolean;
}

export function CalendarContainer({ calendarIds, viewingAllCalendars = false }: CalendarContainerProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view') as CalendarView;
  
  const [currentView, setCurrentView] = useState<CalendarView>(
    viewParam && ['month', 'week', 'year'].includes(viewParam) ? viewParam : 'month'
  );
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const { checkAccess } = useAccessControl();
  
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

  // The calendar grid shows only ACTIVE bookings. A cancelled/no-show row stays in the DB
  // but its slot is genuinely free (the bookings_no_overlap constraint, availability, and
  // dashboard metrics all exclude it), so painting it as an occupied block — or counting it
  // in the day badge — would mislead the owner, especially after the WhatsApp agent cancels
  // a booking. Filter at the source so every grid surface (week/month/year + day count) agrees.
  const activeBookings = useMemo(
    () => bookings.filter((b) => b.status !== 'cancelled' && b.status !== 'no-show'),
    [bookings],
  );

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

  const goToToday = () => setCurrentDate(new Date());

  const handleBookingCreated = () => {
    refetch();
    setIsNewBookingModalOpen(false);
  };

  const handleNewBooking = () => {
    if (checkAccess('canCreateBookings')) {
      setIsNewBookingModalOpen(true);
    } else {
      setShowUpgradeModal(true);
    }
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
    <div className="surface-raised rounded-xl h-full max-h-full flex flex-col overflow-hidden">
      <CalendarHeader
        currentView={currentView}
        currentDate={currentDate}
        onViewChange={handleViewChange}
        onNavigate={navigateDate}
        onToday={goToToday}
        onNewBooking={handleNewBooking}
        loading={loading}
        timeRange={timeRange}
        onTimeRangeChange={handleTimeRangeChange}
      />

      <div className="flex-1 overflow-auto min-h-0 relative">
        <div className="relative z-10 h-full min-h-0">
          <CalendarContent
            currentView={currentView}
            bookings={activeBookings}
            currentDate={currentDate}
            loading={loading}
            error={error}
            onRetry={refetch}
            timeRange={timeRange}
            viewingAllCalendars={viewingAllCalendars}
          />
        </div>
      </div>

      <NewBookingModal
        open={isNewBookingModalOpen}
        onClose={handleModalClose}
        calendarId={calendarIds[0] || ''} // Use first calendar for new bookings
        onBookingCreated={handleBookingCreated}
      />

      <AppointmentUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
}
