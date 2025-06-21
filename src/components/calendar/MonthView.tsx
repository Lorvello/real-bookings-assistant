
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useBookingData } from '@/hooks/useBookingData';
import { useAuth } from '@/hooks/useAuth';

interface MonthViewProps {
  currentDate: Date;
  calendarId?: string;
}

export function MonthView({ currentDate, calendarId }: MonthViewProps) {
  const { user } = useAuth();
  const { bookings, loading, error, getBookingsForDate, formatBookingTime } = useBookingData(calendarId);
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-gray-300">Kalender laden...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-red-400 mb-2">Fout bij laden kalender</div>
          <div className="text-sm text-gray-400">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b border-gray-700 mb-2">
        {weekDays.map(day => (
          <div key={day} className="p-2 text-sm font-medium text-gray-400 text-center">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 flex-1 gap-1">
        {days.map(day => {
          const dayBookings = getBookingsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              className={`border border-gray-700 rounded-lg p-2 min-h-[100px] ${
                isCurrentMonth ? 'bg-gray-800' : 'bg-gray-900 opacity-50'
              } ${isToday ? 'ring-2 ring-green-600' : ''}`}
            >
              <div className={`text-sm font-medium mb-2 ${
                isToday ? 'text-green-400' : 'text-gray-300'
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
                    title={`${formatBookingTime(booking.start_time, booking.end_time)} - ${booking.customer_name} (${booking.service_types?.name || 'Afspraak'})`}
                  >
                    <div className="font-medium truncate">
                      {format(new Date(booking.start_time), 'HH:mm')} {booking.customer_name}
                    </div>
                    <div className="text-xs opacity-75 truncate">
                      {booking.service_types?.name || 'Afspraak'}
                    </div>
                  </div>
                ))}
                {dayBookings.length > 3 && (
                  <div className="text-xs text-gray-400">
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
