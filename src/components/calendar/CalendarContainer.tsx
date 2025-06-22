
import { useState } from 'react';
import { addMonths, subMonths, addWeeks, subWeeks, addYears, subYears } from 'date-fns';
import { CalendarHeader } from './CalendarHeader';
import { CalendarContent } from './CalendarContent';
import { NewBookingModal } from '../NewBookingModal';
import { useMultipleCalendarBookings } from '@/hooks/useMultipleCalendarBookings';

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
    refetch();
  };

  const handleNewBooking = () => {
    console.log('Opening new booking modal');
    setIsNewBookingModalOpen(true);
  };

  return (
    <div className="bg-card rounded-xl border border-border h-full flex flex-col overflow-hidden">
      <CalendarHeader
        currentView={currentView}
        currentDate={currentDate}
        onViewChange={setCurrentView}
        onNavigate={navigateDate}
        onNewBooking={handleNewBooking}
        loading={loading}
      />

      <div className="flex-1 overflow-y-auto min-h-0">
        <CalendarContent
          currentView={currentView}
          bookings={bookings}
          currentDate={currentDate}
          loading={loading}
          error={error}
        />
      </div>

      <NewBookingModal
        open={isNewBookingModalOpen}
        onClose={() => setIsNewBookingModalOpen(false)}
        calendarId={calendarIds[0] || ''} // Use first calendar for new bookings
        onBookingCreated={handleBookingCreated}
      />
    </div>
  );
}
