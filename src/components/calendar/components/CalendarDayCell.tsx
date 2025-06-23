
import { format, isSameMonth, isToday } from 'date-fns';
import { Calendar, Clock, User, Phone } from 'lucide-react';

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

interface CalendarDayCellProps {
  day: Date;
  currentDate: Date;
  dayBookings: Booking[];
  onDayClick: (day: Date, dayBookings: Booking[]) => void;
  onBookingClick: (booking: Booking) => void;
}

export function CalendarDayCell({ 
  day, 
  currentDate, 
  dayBookings, 
  onDayClick, 
  onBookingClick 
}: CalendarDayCellProps) {
  const isCurrentMonth = isSameMonth(day, currentDate);
  const isDayToday = isToday(day);
  const hasMultipleBookings = dayBookings.length > 1;

  return (
    <div
      className={`group rounded-xl p-2 min-h-[80px] transition-colors duration-200 cursor-pointer ${
        hasMultipleBookings ? 'cursor-pointer' : ''
      } ${
        isCurrentMonth 
          ? isDayToday
            ? 'bg-primary/20 border border-primary/40'
            : 'bg-card border border-border/40 hover:border-primary/20'
          : 'bg-muted/40 border border-border/20 opacity-60'
      }`}
      onClick={() => onDayClick(day, dayBookings)}
    >
      {/* Day Header */}
      <div className={`flex items-center justify-between mb-1.5 ${
        isDayToday ? 'text-primary' : 'text-foreground'
      }`}>
        <div className={`text-sm font-semibold ${
          isDayToday 
            ? 'bg-primary text-primary-foreground w-6 h-6 rounded-lg flex items-center justify-center text-xs' 
            : ''
        }`}>
          {format(day, 'd')}
        </div>
        {dayBookings.length > 0 && (
          <div className="flex items-center gap-1 bg-blue-500/15 text-blue-600 px-1 py-0.5 rounded font-medium text-xs">
            <Calendar className="w-2 h-2" />
            {dayBookings.length}
          </div>
        )}
      </div>
      
      {/* Bookings Display */}
      <div className="space-y-1">
        {dayBookings.length === 0 && isCurrentMonth && (
          <div className="text-center py-1 opacity-0 group-hover:opacity-60 transition-opacity duration-300">
            <div className="text-xs text-muted-foreground">Geen afspraken</div>
          </div>
        )}
        
        {dayBookings.length === 1 && (
          <div
            className="p-1.5 rounded-lg cursor-pointer hover:opacity-90 transition-opacity duration-200 border border-white/10"
            style={{
              backgroundColor: `${dayBookings[0].service_types?.color || '#3B82F6'}dd`
            }}
            title={`${format(new Date(dayBookings[0].start_time), 'HH:mm')} - ${dayBookings[0].customer_name}`}
            onClick={(e) => {
              e.stopPropagation();
              onBookingClick(dayBookings[0]);
            }}
          >
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-1 text-white text-xs font-medium">
                <Clock className="w-2 h-2" />
                {format(new Date(dayBookings[0].start_time), 'HH:mm')}
              </div>
              <div className={`w-1 h-1 rounded-full ${
                dayBookings[0].status === 'confirmed' ? 'bg-white/80' :
                dayBookings[0].status === 'pending' ? 'bg-yellow-300/80' :
                'bg-red-300/80'
              }`} />
            </div>
            <div className="text-white/90 text-xs font-medium truncate mb-0.5 flex items-center gap-1">
              <User className="w-2 h-2" />
              {dayBookings[0].customer_name}
            </div>
            <div className="text-white/75 text-xs truncate">
              {dayBookings[0].service_types?.name || dayBookings[0].service_name || 'Afspraak'}
            </div>
          </div>
        )}
        
        {dayBookings.length > 1 && (
          <div className="text-center py-1.5 bg-blue-500/15 rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition-colors duration-200 cursor-pointer">
            <div className="text-blue-600 font-medium text-xs mb-0.5 flex items-center justify-center gap-1">
              <Calendar className="w-2.5 h-2.5" />
              {dayBookings.length} afspraken
            </div>
            <div className="text-xs text-blue-600/70">
              Klik voor details
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
