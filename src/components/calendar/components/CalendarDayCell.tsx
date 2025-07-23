
import { format, isSameMonth, isSameDay } from 'date-fns';

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
  onSingleBookingClick?: (booking: Booking, event: React.MouseEvent) => void;
}

export function CalendarDayCell({ 
  day, 
  currentDate, 
  dayBookings, 
  onDayClick,
  onSingleBookingClick
}: CalendarDayCellProps) {
  const isCurrentMonth = isSameMonth(day, currentDate);
  const isToday = isSameDay(day, new Date());
  const hasMultipleBookings = dayBookings.length > 1;
  const hasSingleBooking = dayBookings.length === 1;

  const handleSingleBookingClick = (booking: Booking, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onSingleBookingClick) {
      onSingleBookingClick(booking, event);
    }
  };

  return (
    <div
      className={`group rounded-xl p-1.5 min-h-[80px] transition-all duration-200 hover:shadow-lg ${
        hasMultipleBookings ? 'cursor-pointer' : ''
      } ${
        isCurrentMonth 
          ? isToday
            ? 'bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border-2 border-primary/40 shadow-lg shadow-primary/10'
            : 'bg-card/90 backdrop-blur-sm border border-border/60 hover:border-primary/30 hover:bg-card/95'
          : 'bg-muted/30 border border-border/30 opacity-60'
      }`}
      onClick={() => hasMultipleBookings && onDayClick(day, dayBookings)}
    >
      <div className={`flex items-center justify-between mb-1 ${
        isToday ? 'text-primary font-bold' : 'text-foreground'
      }`}>
        <div className={`text-sm font-bold ${
          isToday 
            ? 'bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs shadow-lg' 
            : ''
        }`}>
          {format(day, 'd')}
        </div>
        {dayBookings.length > 0 && (
          <div className="text-xs bg-blue-500/20 text-blue-600 px-1 py-0.5 rounded-full font-medium">
            {dayBookings.length}
          </div>
        )}
      </div>
      
      <div className="space-y-0.5">
        {/* Show appointments differently based on count */}
        {dayBookings.length === 0 && isCurrentMonth && (
          <div className="text-center py-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="text-xs text-muted-foreground mb-0.5">No appointments</div>
            <div className="w-3 h-px bg-border mx-auto"></div>
          </div>
        )}
        
        {hasSingleBooking && (
          <div
            className="group/booking p-1 rounded-lg cursor-pointer hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md"
            style={{
              backgroundColor: dayBookings[0].service_types?.color || '#3B82F6',
              backgroundImage: `linear-gradient(135deg, ${dayBookings[0].service_types?.color || '#3B82F6'}, ${dayBookings[0].service_types?.color || '#3B82F6'}dd)`
            }}
            title={`${format(new Date(dayBookings[0].start_time), 'HH:mm')} - ${dayBookings[0].customer_name} (${dayBookings[0].service_types?.name || dayBookings[0].service_name || 'Appointment'})`}
            onClick={(e) => handleSingleBookingClick(dayBookings[0], e)}
          >
            <div className="flex items-center justify-between">
              <div className="text-white text-xs font-semibold">
                {format(new Date(dayBookings[0].start_time), 'HH:mm')}
              </div>
              <div className={`w-1 h-1 rounded-full ${
                dayBookings[0].status === 'confirmed' ? 'bg-white/90' :
                dayBookings[0].status === 'pending' ? 'bg-yellow-300/90' :
                'bg-red-300/90'
              }`} />
            </div>
            <div className="text-white/95 text-xs font-medium truncate mt-0.5">
              {dayBookings[0].customer_name}
            </div>
            <div className="text-white/80 text-xs truncate">
              {dayBookings[0].service_types?.name || dayBookings[0].service_name || 'Appointment'}
            </div>
          </div>
        )}
        
        {hasMultipleBookings && (
          <div className="text-center py-2 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg border border-blue-500/20 hover:from-blue-500/15 hover:to-blue-500/10 hover:border-blue-500/30 transition-all duration-200 cursor-pointer group-hover:scale-105">
            <div className="text-blue-600 font-semibold text-xs mb-0.5">
              {dayBookings.length} appointments
            </div>
            <div className="text-xs text-blue-600/70">
              Click for details
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
