
import { useState } from 'react';
import { addMonths, subMonths, addWeeks, subWeeks, addYears, subYears } from 'date-fns';
import { CalendarHeader } from './CalendarHeader';
import { CalendarContent } from './CalendarContent';
import { NewBookingModal } from '../NewBookingModal';
import { useBookings } from '@/hooks/useBookings';

type CalendarView = 'month' | 'week' | 'year';

interface CalendarContainerProps {
  calendarId: string;
}

export function CalendarContainer({ calendarId }: CalendarContainerProps) {
  console.log('CalendarContainer rendering with calendarId:', calendarId);
  
  const [currentView, setCurrentView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  
  const { bookings, loading, error, refetch } = useBookings(calendarId);

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
    <div className="bg-card rounded-xl border border-border h-full flex flex-col">
      <CalendarHeader
        currentView={currentView}
        currentDate={currentDate}
        onViewChange={setCurrentView}
        onNavigate={navigateDate}
        onNewBooking={handleNewBooking}
        loading={loading}
      />

      <div className="flex-1 overflow-hidden">
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
        calendarId={calendarId}
        onBookingCreated={handleBookingCreated}
      />
    </div>
  );
}
