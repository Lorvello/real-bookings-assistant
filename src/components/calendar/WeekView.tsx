
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { nl } from 'date-fns/locale';

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  customer_phone?: string;
  status: string;
  service_types?: {
    name: string;
    color: string;
    duration: number;
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
  return Math.max(0, (offsetMinutes / 30) * 60); // 30 min = 60px
};

// Booking Block Component
function BookingBlock({ booking, timeSlot }: { booking: Booking; timeSlot: string }) {
  const startTime = new Date(booking.start_time);
  const endTime = new Date(booking.end_time);
  const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes
  const height = Math.max(30, (duration / 30) * 60); // minimum 30px, 30 min = 60px
  const topOffset = calculateTopOffset(startTime, timeSlot);

  return (
    <div
      className="absolute inset-x-0 mx-1 p-2 rounded cursor-pointer hover:shadow-lg transition-all z-10"
      style={{
        backgroundColor: booking.service_types?.color || '#10B981',
        height: `${height}px`,
        top: `${topOffset}px`
      }}
      title={`${booking.customer_name} - ${booking.service_types?.name || 'Afspraak'} (${booking.customer_phone || 'Geen telefoon'})`}
    >
      <div className="text-xs text-white">
        <div className="font-semibold truncate">{booking.customer_name}</div>
        <div className="opacity-90 truncate">{booking.service_types?.name || 'Afspraak'}</div>
        {booking.customer_phone && (
          <div className="opacity-75 truncate flex items-center mt-1">
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
  const weekDays = getWeekDays(currentDate);
  const timeSlots = generateTimeSlots(7, 22, 30); // 7:00 - 22:00, 30 min slots

  return (
    <div className="h-full overflow-auto bg-card">
      {/* Fixed header with days */}
      <div className="sticky top-0 z-20 bg-card border-b border-border">
        <div className="grid grid-cols-8 gap-px">
          <div className="w-16"></div> {/* Time column */}
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="text-center py-3 px-2">
              <div className="text-xs text-muted-foreground">{format(day, 'EEE', { locale: nl })}</div>
              <div className={`text-lg font-semibold ${isToday(day) ? 'text-primary' : 'text-foreground'}`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable time grid */}
      <div className="relative">
        {/* Time slots */}
        {timeSlots.map((timeSlot) => (
          <div key={timeSlot} className="grid grid-cols-8 gap-px border-b border-border">
            {/* Time label */}
            <div className="w-16 py-4 px-2 text-xs text-muted-foreground text-right">
              {timeSlot}
            </div>
            
            {/* Day columns */}
            {weekDays.map((day) => {
              const dayBookings = getBookingsForTimeSlot(bookings, day, timeSlot);
              
              return (
                <div
                  key={`${day.toISOString()}-${timeSlot}`}
                  className="relative bg-card hover:bg-accent transition-colors min-h-[60px]"
                >
                  {dayBookings.map((booking) => (
                    <BookingBlock
                      key={booking.id}
                      booking={booking}
                      timeSlot={timeSlot}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
