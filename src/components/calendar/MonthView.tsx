
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
  const weekDays = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];

  const getBookingsForDay = (day: Date) => {
    return bookings.filter(booking => 
      isSameDay(new Date(booking.start_time), day)
    );
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-y-auto">
      <div className="p-6 bg-gradient-to-br from-background via-card to-background/95 flex-1 min-h-0 overflow-y-auto">
        {/* Week day headers */}
        <div className="grid grid-cols-7 mb-4 bg-card/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-border/40 sticky top-0 z-10">
          {weekDays.map(day => (
            <div key={day} className="text-center py-3">
              <div className="text-sm font-semibold text-foreground">{day.slice(0, 2).toUpperCase()}</div>
              <div className="text-xs text-muted-foreground mt-1">{day.slice(2)}</div>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-3 pb-6">
          {days.map(day => {
            const dayBookings = getBookingsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className={`group rounded-xl p-4 min-h-[140px] transition-all duration-200 hover:shadow-lg cursor-pointer ${
                  isCurrentMonth 
                    ? isToday
                      ? 'bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border-2 border-primary/40 shadow-lg shadow-primary/10'
                      : 'bg-card/90 backdrop-blur-sm border border-border/60 hover:border-primary/30 hover:bg-card/95'
                    : 'bg-muted/30 border border-border/30 opacity-60'
                }`}
              >
                <div className={`flex items-center justify-between mb-3 ${
                  isToday ? 'text-primary font-bold' : 'text-foreground'
                }`}>
                  <div className={`text-lg font-bold ${
                    isToday 
                      ? 'bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-lg' 
                      : ''
                  }`}>
                    {format(day, 'd')}
                  </div>
                  {dayBookings.length > 0 && (
                    <div className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full font-medium">
                      {dayBookings.length}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  {dayBookings.slice(0, 3).map(booking => (
                    <div
                      key={booking.id}
                      className="group/booking p-2.5 rounded-lg cursor-pointer hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md"
                      style={{
                        backgroundColor: booking.service_types?.color || '#10B981',
                        backgroundImage: `linear-gradient(135deg, ${booking.service_types?.color || '#10B981'}, ${booking.service_types?.color || '#10B981'}dd)`
                      }}
                      title={`${format(new Date(booking.start_time), 'HH:mm')} - ${booking.customer_name} (${booking.service_types?.name || booking.service_name || 'Afspraak'})`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-white text-xs font-semibold">
                          {format(new Date(booking.start_time), 'HH:mm')}
                        </div>
                        <div className={`w-2 h-2 rounded-full ${
                          booking.status === 'confirmed' ? 'bg-white/90' :
                          booking.status === 'pending' ? 'bg-yellow-300/90' :
                          'bg-red-300/90'
                        }`} />
                      </div>
                      <div className="text-white/95 text-xs font-medium truncate mt-1">
                        {booking.customer_name}
                      </div>
                      <div className="text-white/80 text-xs truncate">
                        {booking.service_types?.name || booking.service_name || 'Afspraak'}
                      </div>
                    </div>
                  ))}
                  {dayBookings.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center py-2 bg-muted/50 rounded-lg border border-dashed border-border/60 group-hover:bg-muted/70 transition-colors">
                      +{dayBookings.length - 3} meer afspraken
                    </div>
                  )}
                  {dayBookings.length === 0 && isCurrentMonth && (
                    <div className="text-center py-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="text-xs text-muted-foreground mb-1">Geen afspraken</div>
                      <div className="w-6 h-px bg-border mx-auto"></div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
