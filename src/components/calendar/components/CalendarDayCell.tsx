
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
      className={`group rounded-2xl p-2 min-h-[90px] transition-all duration-300 cursor-pointer hover:scale-[1.01] hover:shadow-lg ${
        hasMultipleBookings ? 'cursor-pointer' : ''
      } ${
        isCurrentMonth 
          ? isDayToday
            ? 'bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 border-2 border-primary/50 shadow-lg shadow-primary/20'
            : 'bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-sm border border-border/60 hover:border-primary/30 hover:shadow-md shadow-black/5'
          : 'bg-gradient-to-br from-muted/60 via-muted/40 to-muted/30 border border-border/30 opacity-60 hover:opacity-80'
      }`}
      onClick={() => onDayClick(day, dayBookings)}
    >
      {/* Day Header */}
      <div className={`flex items-center justify-between mb-2 ${
        isDayToday ? 'text-primary' : 'text-foreground'
      }`}>
        <div className={`text-base font-bold ${
          isDayToday 
            ? 'bg-primary text-primary-foreground w-7 h-7 rounded-xl flex items-center justify-center text-sm shadow-lg shadow-primary/30' 
            : ''
        }`}>
          {format(day, 'd')}
        </div>
        {dayBookings.length > 0 && (
          <div className="flex items-center gap-1 bg-blue-500/20 text-blue-600 px-1.5 py-0.5 rounded-lg font-semibold text-xs border border-blue-500/30">
            <Calendar className="w-2.5 h-2.5" />
            {dayBookings.length}
          </div>
        )}
      </div>
      
      {/* Bookings Display */}
      <div className="space-y-1.5">
        {dayBookings.length === 0 && isCurrentMonth && (
          <div className="text-center py-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="text-xs text-muted-foreground mb-1 font-medium">Geen afspraken</div>
            <div className="w-6 h-px bg-gradient-to-r from-transparent via-border to-transparent mx-auto"></div>
          </div>
        )}
        
        {dayBookings.length === 1 && (
          <div
            className="group/booking p-2 rounded-xl cursor-pointer hover:scale-105 transition-all duration-300 shadow-sm hover:shadow-md border border-white/20"
            style={{
              background: `linear-gradient(135deg, ${dayBookings[0].service_types?.color || '#3B82F6'}, ${dayBookings[0].service_types?.color || '#3B82F6'}dd)`
            }}
            title={`${format(new Date(dayBookings[0].start_time), 'HH:mm')} - ${dayBookings[0].customer_name}`}
            onClick={(e) => {
              e.stopPropagation();
              onBookingClick(dayBookings[0]);
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 text-white text-xs font-bold">
                <Clock className="w-2.5 h-2.5" />
                {format(new Date(dayBookings[0].start_time), 'HH:mm')}
              </div>
              <div className={`w-1.5 h-1.5 rounded-full ${
                dayBookings[0].status === 'confirmed' ? 'bg-white/90' :
                dayBookings[0].status === 'pending' ? 'bg-yellow-300/90' :
                'bg-red-300/90'
              }`} />
            </div>
            <div className="text-white/95 text-xs font-semibold truncate mb-1 flex items-center gap-1.5">
              <User className="w-2.5 h-2.5" />
              {dayBookings[0].customer_name}
            </div>
            <div className="text-white/80 text-xs truncate">
              {dayBookings[0].service_types?.name || dayBookings[0].service_name || 'Afspraak'}
            </div>
            {dayBookings[0].customer_phone && (
              <div className="text-white/70 text-xs truncate flex items-center gap-1 mt-1 opacity-0 group-hover/booking:opacity-100 transition-opacity">
                <Phone className="w-2.5 h-2.5" />
                {dayBookings[0].customer_phone}
              </div>
            )}
          </div>
        )}
        
        {dayBookings.length > 1 && (
          <div className="text-center py-2.5 bg-gradient-to-br from-blue-500/20 via-blue-500/15 to-blue-500/10 rounded-xl border border-blue-500/30 hover:from-blue-500/25 hover:to-blue-500/15 hover:border-blue-500/40 transition-all duration-300 cursor-pointer group-hover:scale-105 shadow-sm hover:shadow-md">
            <div className="text-blue-600 font-bold text-sm mb-0.5 flex items-center justify-center gap-1.5">
              <Calendar className="w-3 h-3" />
              {dayBookings.length} afspraken
            </div>
            <div className="text-xs text-blue-600/80 font-medium">
              Klik voor details
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
