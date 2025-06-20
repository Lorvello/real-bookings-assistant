
import { format, startOfWeek, endOfWeek, eachDayOfInterval, eachHourOfInterval, startOfDay, endOfDay } from 'date-fns';
import { nl } from 'date-fns/locale';

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  customer_phone: string | null;
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

export function WeekView({ bookings, currentDate }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const hours = eachHourOfInterval({ 
    start: new Date(0, 0, 0, 8), // 8:00
    end: new Date(0, 0, 0, 18)   // 18:00
  });

  const getBookingsForDayAndHour = (day: Date, hour: Date) => {
    return bookings.filter(booking => {
      const bookingStart = new Date(booking.start_time);
      const bookingHour = bookingStart.getHours();
      const hourOfDay = hour.getHours();
      
      return (
        bookingStart.toDateString() === day.toDateString() &&
        bookingHour === hourOfDay
      );
    });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Week header */}
      <div className="grid grid-cols-8 border-b border-border">
        <div className="p-2"></div> {/* Empty cell for time column */}
        {days.map(day => (
          <div key={day.toISOString()} className="p-2 text-center border-l border-border">
            <div className="text-sm font-medium text-foreground">
              {format(day, 'EEE', { locale: nl })}
            </div>
            <div className="text-lg font-semibold text-foreground">
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Time slots grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-8">
          {/* Time column */}
          <div className="border-r border-border">
            {hours.map(hour => (
              <div key={hour.toISOString()} className="h-16 p-2 border-b border-border text-sm text-muted-foreground">
                {format(hour, 'HH:mm')}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map(day => (
            <div key={day.toISOString()} className="border-r border-border">
              {hours.map(hour => {
                const slotBookings = getBookingsForDayAndHour(day, hour);
                
                return (
                  <div key={hour.toISOString()} className="h-16 border-b border-border p-1 relative">
                    {slotBookings.map((booking, index) => (
                      <div
                        key={booking.id}
                        className="absolute inset-1 p-1 rounded text-xs text-white overflow-hidden"
                        style={{
                          backgroundColor: booking.service_types?.color || '#10B981',
                          top: `${(index * 20) + 4}px`,
                          height: '16px'
                        }}
                        title={`${booking.customer_name} - ${booking.service_types?.name || 'Afspraak'} (${booking.customer_phone || 'Geen telefoon'})`}
                      >
                        <div className="truncate font-medium">
                          {booking.customer_name}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
