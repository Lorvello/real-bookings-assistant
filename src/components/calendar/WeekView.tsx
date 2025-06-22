import { useState } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { nl } from 'date-fns/locale';
import { BookingDetailModal } from './BookingDetailModal';

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

interface WeekViewProps {
  bookings: Booking[];
  currentDate: Date;
}

// Helper functions
const generateTimeSlots = (startHour: number, endHour: number, intervalMinutes: number) => {
  const slots = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(timeString);
    }
  }
  return slots;
};

const getWeekDays = (currentDate: Date) => {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: weekStart, end: weekEnd });
};

const getBookingsForTimeSlot = (bookings: Booking[], day: Date, timeSlot: string) => {
  const [hours, minutes] = timeSlot.split(':').map(Number);
  const slotStart = new Date(day);
  slotStart.setHours(hours, minutes, 0, 0);
  const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000); // 30 minutes later

  return bookings.filter(booking => {
    const bookingStart = new Date(booking.start_time);
    const bookingEnd = new Date(booking.end_time);
    
    return (
      isSameDay(bookingStart, day) &&
      ((bookingStart >= slotStart && bookingStart < slotEnd) ||
       (bookingStart < slotStart && bookingEnd > slotStart))
    );
  });
};

const calculateTopOffset = (startTime: Date, timeSlot: string) => {
  const [slotHours, slotMinutes] = timeSlot.split(':').map(Number);
  const slotStart = new Date(startTime);
  slotStart.setHours(slotHours, slotMinutes, 0, 0);
  
  const bookingHours = startTime.getHours();
  const bookingMinutes = startTime.getMinutes();
  const slotTotalMinutes = slotHours * 60 + slotMinutes;
  const bookingTotalMinutes = bookingHours * 60 + bookingMinutes;
  
  const offsetMinutes = bookingTotalMinutes - slotTotalMinutes;
  return Math.max(0, (offsetMinutes / 30) * 80); // 30 min = 80px (verhoogd van 60px)
};

// Booking Block Component
function BookingBlock({ booking, timeSlot, onBookingClick }: { booking: Booking; timeSlot: string; onBookingClick: (booking: Booking) => void }) {
  const startTime = new Date(booking.start_time);
  const endTime = new Date(booking.end_time);
  const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes
  const height = Math.max(40, (duration / 30) * 80); // minimum 40px, 30 min = 80px
  const topOffset = calculateTopOffset(startTime, timeSlot);

  return (
    <div
      className="absolute inset-x-0 mx-2 p-3 rounded-2xl cursor-pointer hover:shadow-xl transition-all duration-200 z-10 group hover:scale-105 border border-white/20"
      style={{
        background: `linear-gradient(135deg, ${booking.service_types?.color || '#3B82F6'}, ${booking.service_types?.color || '#3B82F6'}dd)`,
        height: `${height}px`,
        top: `${topOffset}px`,
        boxShadow: `0 4px 20px ${booking.service_types?.color || '#3B82F6'}40`
      }}
      title={`${booking.customer_name} - ${booking.service_types?.name || 'Afspraak'} (${booking.customer_phone || 'Geen telefoon'})`}
      onClick={() => onBookingClick(booking)}
    >
      <div className="text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold text-sm truncate">{booking.customer_name}</div>
          <div className={`w-2 h-2 rounded-full ${
            booking.status === 'confirmed' ? 'bg-white/90' :
            booking.status === 'pending' ? 'bg-yellow-300/90' :
            'bg-red-300/90'
          }`} />
        </div>
        <div className="text-white/90 text-xs font-medium truncate mb-1">
          {booking.service_types?.name || 'Afspraak'}
        </div>
        <div className="text-white/80 text-xs">
          {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
        </div>
        {booking.customer_phone && (
          <div className="text-white/70 text-xs truncate flex items-center mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            {booking.customer_phone}
          </div>
        )}
      </div>
    </div>
  );
}

export function WeekView({ bookings, currentDate }: WeekViewProps) {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingDetailOpen, setBookingDetailOpen] = useState(false);
  
  const weekDays = getWeekDays(currentDate);
  const timeSlots = generateTimeSlots(7, 22, 30); // 7:00 - 22:00, 30 min slots

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setBookingDetailOpen(true);
  };

  const closeBookingDetail = () => {
    setBookingDetailOpen(false);
    setSelectedBooking(null);
  };

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-background via-card to-background/95">
      {/* Fixed header with days */}
      <div className="sticky top-0 z-20 bg-card/95 backdrop-blur-sm border-b border-border/60 shadow-sm">
        <div className="grid grid-cols-8 gap-px">
          <div className="w-20 p-4">
            <div className="text-xs font-semibold text-muted-foreground">Tijd</div>
          </div>
          {weekDays.map((day) => (
            <div key={day.toISOString()} className={`text-center py-4 px-2 rounded-2xl mx-1 transition-all duration-200 ${
              isToday(day) 
                ? 'bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30' 
                : 'hover:bg-accent/50'
            }`}>
              <div className="text-xs text-muted-foreground font-medium">
                {format(day, 'EEE', { locale: nl })}
              </div>
              <div className={`text-xl font-bold mt-1 ${
                isToday(day) ? 'text-primary' : 'text-foreground'
              }`}>
                {format(day, 'd')}
              </div>
              <div className="text-xs text-muted-foreground">
                {format(day, 'MMM', { locale: nl })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable time grid */}
      <div className="relative">
        {/* Time slots */}
        {timeSlots.map((timeSlot, index) => (
          <div key={timeSlot} className={`grid grid-cols-8 gap-px ${
            index % 2 === 0 ? 'bg-muted/20' : 'bg-transparent'
          }`}>
            {/* Time label */}
            <div className="w-20 py-6 px-4 text-sm font-medium text-muted-foreground text-right border-r border-border/40">
              {timeSlot}
            </div>
            
            {/* Day columns */}
            {weekDays.map((day) => {
              const dayBookings = getBookingsForTimeSlot(bookings, day, timeSlot);
              
              return (
                <div
                  key={`${day.toISOString()}-${timeSlot}`}
                  className={`relative transition-colors min-h-[80px] border-r border-border/30 ${
                    isToday(day) 
                      ? 'bg-primary/5 hover:bg-primary/10' 
                      : 'bg-card/50 hover:bg-accent/30'
                  }`}
                >
                  {dayBookings.map((booking) => (
                    <BookingBlock
                      key={booking.id}
                      booking={booking}
                      timeSlot={timeSlot}
                      onBookingClick={handleBookingClick}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <BookingDetailModal
        open={bookingDetailOpen}
        onClose={closeBookingDetail}
        booking={selectedBooking}
      />
    </div>
  );
}
