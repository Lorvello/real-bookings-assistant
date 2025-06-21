
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { nl } from 'date-fns/locale';

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  customer_phone?: string;
  status: string;
  service_name?: string;
  service_types?: {
    name: string;
    color: string;
    duration: number;
  } | null;
}

interface MonthViewProps {
  bookings: Booking[];
  currentDate: Date;
}

export function MonthView({ bookings, currentDate }: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

  const getBookingsForDay = (day: Date) => {
    return bookings.filter(booking => 
      isSameDay(new Date(booking.start_time), day)
    );
  };

  return (
    <div className="h-full flex flex-col p-4">
      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b border-border mb-2">
        {weekDays.map(day => (
          <div key={day} className="p-2 text-sm font-medium text-muted-foreground text-center">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 flex-1 gap-1">
        {days.map(day => {
          const dayBookings = getBookingsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              className={`border border-border rounded-lg p-2 min-h-[100px] ${
                isCurrentMonth ? 'bg-card' : 'bg-muted opacity-50'
              } ${isToday ? 'ring-2 ring-primary' : ''}`}
            >
              <div className={`text-sm font-medium mb-2 ${
                isToday ? 'text-primary' : 'text-foreground'
              }`}>
                {format(day, 'd')}
              </div>
              
              <div className="space-y-1">
                {dayBookings.slice(0, 3).map(booking => (
                  <div
                    key={booking.id}
                    className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor: booking.service_types?.color || '#10B981',
                      color: 'white'
                    }}
                    title={`${format(new Date(booking.start_time), 'HH:mm')} - ${booking.customer_name} (${booking.service_types?.name || booking.service_name || 'Afspraak'})`}
                  >
                    <div className="font-medium">
                      {format(new Date(booking.start_time), 'HH:mm')}
                    </div>
                    <div className="truncate">
                      {booking.customer_name}
                    </div>
                  </div>
                ))}
                {dayBookings.length > 3 && (
                  <div className="text-xs text-muted-foreground text-center py-1">
                    +{dayBookings.length - 3} meer
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
