import { useState } from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { DayBookingsModal } from './DayBookingsModal';
import { BookingDetailModal } from './BookingDetailModal';

import { CalendarWeekHeader } from './components/CalendarWeekHeader';
import { CalendarDayCell } from './components/CalendarDayCell';

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  status: string;
  service_name?: string;
  notes?: string;
  internal_notes?: string;
  total_price?: number;
  service_types?: {
    name: string;
    color: string;
    duration: number;
    description?: string;
  } | null;
  calendar?: {
    id?: string;
    name: string;
    color: string;
    user_id?: string;
    users?: {
      full_name: string;
    };
  };
}

interface ModernMonthViewProps {
  bookings: Booking[];
  currentDate: Date;
  viewingAllCalendars?: boolean;
}

export function ModernMonthView({ bookings, currentDate, viewingAllCalendars = false }: ModernMonthViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [bookingDetailOpen, setBookingDetailOpen] = useState(false);
  const [modalPosition, setModalPosition] = useState<{ x: number; y: number } | undefined>(undefined);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const getBookingsForDay = (day: Date) => {
    return bookings.filter(booking => 
      isSameDay(new Date(booking.start_time), day)
    );
  };

  const handleDayClick = (day: Date, dayBookings: Booking[], event?: React.MouseEvent) => {
    // Always close any existing modals first
    closeDayModal();
    closeBookingDetail();
    
    if (dayBookings.length === 1) {
      // Single appointment - show detailed modal directly
      setSelectedBooking(dayBookings[0]);
      setBookingDetailOpen(true);
    } else if (dayBookings.length > 1) {
      // Multiple appointments - show day modal first
      if (event) {
        const rect = event.currentTarget.getBoundingClientRect();
        setModalPosition({
          x: rect.left + rect.width / 2,
          y: rect.top
        });
      }
      setSelectedDate(day);
      setDayModalOpen(true);
    }
  };

  const handleSingleBookingClick = (booking: Booking, event: React.MouseEvent) => {
    event.stopPropagation();
    // Always close any existing modals first
    closeDayModal();
    closeBookingDetail();
    
    setSelectedBooking(booking);
    setBookingDetailOpen(true);
  };

  const closeDayModal = () => {
    setDayModalOpen(false);
    setSelectedDate(null);
    setModalPosition(undefined);
  };

  const closeBookingDetail = () => {
    setBookingDetailOpen(false);
    setSelectedBooking(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Enhanced Week Headers */}
      <CalendarWeekHeader weekDays={weekDays} />

      {/* Optimized Calendar Grid with subtle gradient background */}
      <div className="flex-1 overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
        <div className="p-1 sm:p-2">
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {days.map(day => {
              const dayBookings = getBookingsForDay(day);

              return (
                <CalendarDayCell
                  key={day.toISOString()}
                  day={day}
                  currentDate={currentDate}
                  dayBookings={dayBookings}
                  onDayClick={handleDayClick}
                  onSingleBookingClick={handleSingleBookingClick}
                />
              );
            })}
          </div>
        </div>
      </div>

      <DayBookingsModal
        open={dayModalOpen}
        onClose={closeDayModal}
        date={selectedDate}
        bookings={selectedDate ? getBookingsForDay(selectedDate) : []}
        position={modalPosition}
        viewingAllCalendars={viewingAllCalendars}
      />

      <BookingDetailModal
        open={bookingDetailOpen}
        onClose={closeBookingDetail}
        booking={selectedBooking}
        viewingAllCalendars={viewingAllCalendars}
      />
    </div>
  );
}
