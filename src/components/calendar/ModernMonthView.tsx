
import { useState } from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { DayBookingsModal } from './DayBookingsModal';
import { BookingDetailModal } from './BookingDetailModal';
import { CalendarWeekHeader } from './components/CalendarWeekHeader';
import { CalendarDayCell } from './components/CalendarDayCell';
import { generateSampleBookings } from './utils/sampleBookings';

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
}

interface ModernMonthViewProps {
  bookings: Booking[];
  currentDate: Date;
}

export function ModernMonthView({ bookings, currentDate }: ModernMonthViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingDetailOpen, setBookingDetailOpen] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

  // Generate sample bookings with detailed logging
  const sampleBookings = generateSampleBookings(currentDate);
  const allBookings = [...bookings, ...sampleBookings];

  console.log('=== CALENDAR DEBUG INFO ===');
  console.log('Current date:', currentDate.toISOString());
  console.log('Month start:', monthStart.toISOString());
  console.log('Month end:', monthEnd.toISOString());
  console.log('Calendar start:', calendarStart.toISOString());
  console.log('Calendar end:', calendarEnd.toISOString());
  console.log('Total days in grid:', days.length);
  console.log('Real bookings:', bookings.length);
  console.log('Sample bookings:', sampleBookings.length);
  console.log('All bookings:', allBookings.length);
  console.log('Sample bookings details:', sampleBookings.map(b => ({
    id: b.id,
    name: b.customer_name,
    date: new Date(b.start_time).toLocaleDateString(),
    time: new Date(b.start_time).toLocaleTimeString()
  })));
  console.log('Days array:', days.map(d => d.toLocaleDateString()));

  const getBookingsForDay = (day: Date) => {
    const dayBookings = allBookings.filter(booking => {
      const bookingDate = new Date(booking.start_time);
      const isSame = isSameDay(bookingDate, day);
      
      if (isSame) {
        console.log(`✅ Found booking for ${day.toLocaleDateString()}:`, {
          booking: booking.customer_name,
          bookingDate: bookingDate.toISOString(),
          dayDate: day.toISOString()
        });
      }
      
      return isSame;
    });
    
    if (dayBookings.length > 0) {
      console.log(`📅 Day ${day.toLocaleDateString()} has ${dayBookings.length} bookings:`, 
        dayBookings.map(b => `${b.customer_name} at ${new Date(b.start_time).toLocaleTimeString()}`));
    }
    
    return dayBookings;
  };

  const handleDayClick = (day: Date, dayBookings: Booking[]) => {
    if (dayBookings.length > 1) {
      setSelectedDate(day);
      setModalOpen(true);
    }
  };

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setBookingDetailOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedDate(null);
  };

  const closeBookingDetail = () => {
    setBookingDetailOpen(false);
    setSelectedBooking(null);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background/95 to-card/50">
      {/* Enhanced Week Headers */}
      <CalendarWeekHeader weekDays={weekDays} />

      {/* Modern Calendar Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pt-2">
          <div className="grid grid-cols-7 gap-3">
            {days.map((day, index) => {
              const dayBookings = getBookingsForDay(day);
              
              console.log(`Day ${index + 1} (${day.toLocaleDateString()}):`, {
                dayBookings: dayBookings.length,
                bookingNames: dayBookings.map(b => b.customer_name)
              });

              return (
                <CalendarDayCell
                  key={day.toISOString()}
                  day={day}
                  currentDate={currentDate}
                  dayBookings={dayBookings}
                  onDayClick={handleDayClick}
                  onBookingClick={handleBookingClick}
                />
              );
            })}
          </div>
        </div>
      </div>

      <DayBookingsModal
        open={modalOpen}
        onClose={closeModal}
        date={selectedDate}
        bookings={selectedDate ? getBookingsForDay(selectedDate) : []}
        onBookingClick={handleBookingClick}
      />

      <BookingDetailModal
        open={bookingDetailOpen}
        onClose={closeBookingDetail}
        booking={selectedBooking}
      />
    </div>
  );
}
