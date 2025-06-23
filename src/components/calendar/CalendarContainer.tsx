
import { useState } from 'react';
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
  
  const [currentView, setCurrentView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  
  const { bookings, loading, error, refetch } = useMultipleCalendarBookings(calendarIds);

  // Enable real-time updates voor alle kalenders
  calendarIds.forEach(calendarId => {
    useRealtimeBookings(calendarId);
  });

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

  return (
    <div className="bg-gradient-to-br from-card via-card/98 to-card/95 rounded-3xl border border-border/40 h-full flex flex-col overflow-hidden shadow-2xl shadow-black/10 backdrop-blur-xl">
      <CalendarHeader
        currentView={currentView}
        currentDate={currentDate}
        onViewChange={setCurrentView}
        onNavigate={navigateDate}
        onNewBooking={handleNewBooking}
        loading={loading}
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
