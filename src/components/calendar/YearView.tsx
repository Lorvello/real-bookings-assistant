
import { format, startOfYear, endOfYear, eachMonthOfInterval, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
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

interface YearViewProps {
  bookings: Booking[];
  currentDate: Date;
}

export function YearView({ bookings, currentDate }: YearViewProps) {
  const yearStart = startOfYear(currentDate);
  const yearEnd = endOfYear(currentDate);
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

  const getBookingsForDay = (day: Date) => {
    return bookings.filter(booking => 
      isSameDay(new Date(booking.start_time), day)
    );
  };

  const getBookingsCountForMonth = (month: Date) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.start_time);
      return bookingDate >= monthStart && bookingDate <= monthEnd;
    }).length;
  };

  const MiniMonth = ({ month }: { month: Date }) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const weekDays = ['M', 'D', 'W', 'D', 'V', 'Z', 'Z'];

    return (
      <div className="bg-card border border-border rounded-lg p-3">
        <div className="text-sm font-medium text-foreground mb-2 text-center">
          {format(month, 'MMMM', { locale: nl })}
        </div>
        <div className="text-xs text-muted-foreground mb-1 text-center">
          {getBookingsCountForMonth(month)} afspraken
        </div>
        
        {/* Mini calendar grid */}
        <div className="grid grid-cols-7 gap-px">
          {weekDays.map(day => (
            <div key={day} className="text-xs text-muted-foreground text-center p-1">
              {day}
            </div>
          ))}
          {days.map(day => {
            const dayBookings = getBookingsForDay(day);
            const isCurrentMonth = isSameMonth(day, month);
            const isToday = isSameDay(day, new Date());
            const hasBookings = dayBookings.length > 0;

            return (
              <div
                key={day.toISOString()}
                className={`text-xs text-center p-1 ${
                  isCurrentMonth 
                    ? hasBookings 
                      ? 'bg-primary text-primary-foreground rounded' 
                      : isToday 
                        ? 'bg-accent text-primary rounded' 
                        : 'text-foreground'
                    : 'text-muted-foreground opacity-50'
                }`}
                title={hasBookings ? `${dayBookings.length} afspraak${dayBookings.length > 1 ? 'en' : ''}` : ''}
              >
                {format(day, 'd')}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-card p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {months.map(month => (
          <MiniMonth key={month.toISOString()} month={month} />
        ))}
      </div>
      
      {/* Year summary */}
      <div className="mt-6 p-4 bg-card border border-border rounded-lg">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Jaaroverzicht {format(currentDate, 'yyyy')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{bookings.length}</div>
            <div className="text-muted-foreground">Totaal afspraken</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {bookings.filter(b => b.status === 'confirmed').length}
            </div>
            <div className="text-muted-foreground">Bevestigd</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {bookings.filter(b => b.status === 'completed').length}
            </div>
            <div className="text-muted-foreground">Voltooid</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {Math.round((bookings.filter(b => b.status === 'completed').length / bookings.length) * 100) || 0}%
            </div>
            <div className="text-muted-foreground">Success rate</div>
          </div>
        </div>
      </div>
    </div>
  );
}
