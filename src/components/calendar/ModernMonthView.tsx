
import { useState } from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { DayBookingsModal } from './DayBookingsModal';

import { CalendarWeekHeader } from './components/CalendarWeekHeader';
import { CalendarDayCell } from './components/CalendarDayCell';
import { GradientContainer } from '@/components/ui/GradientContainer';

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

  const handleDayClick = (day: Date, dayBookings: Booking[]) => {
    if (dayBookings.length > 1) {
      setSelectedDate(day);
      setModalOpen(true);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedDate(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Enhanced Week Headers */}
      <CalendarWeekHeader weekDays={weekDays} />

      {/* Optimized Calendar Grid with subtle gradient background */}
      <div className="flex-1 overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
        <div className="p-2">
          <div className="grid grid-cols-7 gap-1">
            {days.map(day => {
              const dayBookings = getBookingsForDay(day);

              return (
                <CalendarDayCell
                  key={day.toISOString()}
                  day={day}
                  currentDate={currentDate}
                  dayBookings={dayBookings}
                  onDayClick={handleDayClick}
                  
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
      />
    </div>
  );
}
