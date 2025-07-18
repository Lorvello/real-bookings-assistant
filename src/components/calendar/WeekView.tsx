
import { useState } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
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
  timeRange?: { startTime: string; endTime: string };
}

// Helper functions
const generateTimeSlots = (startTime: string, endTime: string, intervalMinutes: number) => {
  const slots = [];
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;
  
  for (let totalMinutes = startTotalMinutes; totalMinutes <= endTotalMinutes; totalMinutes += intervalMinutes) {
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    slots.push(timeString);
  }
  return slots;
};

const getWeekDays = (currentDate: Date) => {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: weekStart, end: weekEnd });
};

// Fixed function to get bookings that START in a specific time slot
const getBookingsStartingInTimeSlot = (bookings: Booking[], day: Date, timeSlot: string) => {
  const [hours, minutes] = timeSlot.split(':').map(Number);
  const slotStart = new Date(day);
  slotStart.setHours(hours, minutes, 0, 0);
  const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000); // 30 minutes later

  return bookings.filter(booking => {
    const bookingStart = new Date(booking.start_time);
    
    return (
      isSameDay(bookingStart, day) &&
      bookingStart >= slotStart && 
      bookingStart < slotEnd
    );
  });
};

// Fixed positioning calculation - made more compact
const calculateBookingPosition = (booking: Booking, baseTimeSlot: string) => {
  const startTime = new Date(booking.start_time);
  const endTime = new Date(booking.end_time);
  const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes
  
  // Calculate top offset from the base time slot
  const [baseHours, baseMinutes] = baseTimeSlot.split(':').map(Number);
  const baseSlotMinutes = baseHours * 60 + baseMinutes;
  
  const bookingHours = startTime.getHours();
  const bookingMinutes = startTime.getMinutes();
  const bookingTotalMinutes = bookingHours * 60 + bookingMinutes;
  
  const offsetMinutes = bookingTotalMinutes - baseSlotMinutes;
  const topOffset = Math.max(0, (offsetMinutes / 30) * 40); // 30 min = 40px (more compact)
  
  // Calculate height based on duration - more compact
  const height = Math.max(24, (duration / 30) * 40); // minimum 24px, 30 min = 40px (more compact)
  
  return { topOffset, height };
};

// Booking Block Component - more compact
function BookingBlock({ booking, timeSlot, onBookingClick }: { booking: Booking; timeSlot: string; onBookingClick: (booking: Booking) => void }) {
  const { topOffset, height } = calculateBookingPosition(booking, timeSlot);
  const startTime = new Date(booking.start_time);
  const endTime = new Date(booking.end_time);

  return (
    <div
      className="absolute inset-x-0 mx-1 p-2 rounded-lg cursor-pointer hover:shadow-lg transition-all duration-200 z-10 group hover:scale-105 border border-white/20"
      style={{
        background: `linear-gradient(135deg, ${booking.service_types?.color || '#3B82F6'}, ${booking.service_types?.color || '#3B82F6'}dd)`,
        height: `${height}px`,
        top: `${topOffset}px`,
        boxShadow: `0 2px 10px ${booking.service_types?.color || '#3B82F6'}40`
      }}
      title={`${booking.customer_name} - ${booking.service_types?.name || 'Appointment'} (${booking.customer_phone || 'No phone'})`}
      onClick={() => onBookingClick(booking)}
    >
      <div className="text-white">
        <div className="flex items-center justify-between mb-1">
          <div className="font-bold text-xs truncate">{booking.customer_name}</div>
          <div className={`w-1.5 h-1.5 rounded-full ${
            booking.status === 'confirmed' ? 'bg-white/90' :
            booking.status === 'pending' ? 'bg-yellow-300/90' :
            'bg-red-300/90'
          }`} />
        </div>
        <div className="text-white/90 text-xs font-medium truncate mb-1">
          {booking.service_types?.name || 'Appointment'}
        </div>
        <div className="text-white/80 text-xs">
          {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
        </div>
        {booking.customer_phone && (
          <div className="text-white/70 text-xs truncate flex items-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg className="w-2.5 h-2.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            {booking.customer_phone}
          </div>
        )}
      </div>
    </div>
  );
}

export function WeekView({ bookings, currentDate, timeRange }: WeekViewProps) {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingDetailOpen, setBookingDetailOpen] = useState(false);
  
  const weekDays = getWeekDays(currentDate);
  
  // Use custom time range or default to business hours
  const startTime = timeRange?.startTime || '08:00';
  const endTime = timeRange?.endTime || '18:00';
  const timeSlots = generateTimeSlots(startTime, endTime, 30);

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
      {/* Fixed header with days - more compact */}
      <div className="sticky top-0 z-20 bg-card/95 backdrop-blur-sm border-b border-border/60 shadow-sm">
        <div className="grid grid-cols-8 gap-px">
          <div className="w-16 p-2">
            <div className="text-xs font-semibold text-muted-foreground">Time</div>
          </div>
          {weekDays.map((day) => (
            <div key={day.toISOString()} className={`text-center py-2 px-1 rounded-lg mx-1 transition-all duration-200 ${
              isToday(day) 
                ? 'bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30' 
                : 'hover:bg-accent/50'
            }`}>
              <div className="text-xs text-muted-foreground font-medium">
                {format(day, 'EEE')}
              </div>
              <div className={`text-lg font-bold mt-0.5 ${
                isToday(day) ? 'text-primary' : 'text-foreground'
              }`}>
                {format(day, 'd')}
              </div>
              <div className="text-xs text-muted-foreground">
                {format(day, 'MMM')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable time grid - more compact */}
      <div className="relative">
        {/* Time slots */}
        {timeSlots.map((timeSlot, index) => (
          <div key={timeSlot} className={`grid grid-cols-8 border-b border-border/20 ${
            index % 2 === 0 ? 'bg-muted/10' : 'bg-transparent'
          }`}>
            {/* Time label */}
            <div className="w-16 py-2 px-2 text-xs font-medium text-muted-foreground text-right border-r border-border/20">
              {timeSlot}
            </div>
            
            {/* Day columns */}
            {weekDays.map((day) => {
              // Only get bookings that START in this time slot to avoid duplicates
              const dayBookings = getBookingsStartingInTimeSlot(bookings, day, timeSlot);
              
              return (
                <div
                  key={`${day.toISOString()}-${timeSlot}`}
                   className={`relative transition-colors min-h-[40px] border-r border-border/20 ${
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
