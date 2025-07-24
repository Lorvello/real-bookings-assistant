
import { format, isSameMonth, isSameDay } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

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
  calendar?: {
    id?: string;
    name: string;
    color: string;
    user_id?: string;
    users?: {
      full_name: string;
    };
  };
}

interface CalendarDayCellProps {
  day: Date;
  currentDate: Date;
  dayBookings: Booking[];
  onDayClick: (day: Date, dayBookings: Booking[], event?: React.MouseEvent) => void;
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

  const handleMultipleBookingsClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onDayClick(day, dayBookings, event);
  };

  const handleDayCellClick = (event: React.MouseEvent) => {
    if (dayBookings.length > 0) {
      onDayClick(day, dayBookings, event);
    }
  };

  return (
    <div
      className={`group rounded-xl p-1.5 min-h-[80px] transition-all duration-200 hover:shadow-lg ${
        dayBookings.length > 0 ? 'cursor-pointer' : ''
      } ${
        isCurrentMonth 
          ? isToday
            ? 'bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border-2 border-primary/40 shadow-lg shadow-primary/10'
            : 'bg-card/90 backdrop-blur-sm border border-border/60 hover:border-primary/30 hover:bg-card/95'
          : 'bg-muted/30 border border-border/30 opacity-60'
      }`}
      onClick={handleDayCellClick}
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
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div
                  className="group/booking p-1 rounded-lg cursor-pointer hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md relative"
                  style={{
                    backgroundColor: dayBookings[0].service_types?.color || '#3B82F6',
                    backgroundImage: `linear-gradient(135deg, ${dayBookings[0].service_types?.color || '#3B82F6'}, ${dayBookings[0].service_types?.color || '#3B82F6'}dd)`
                  }}
                  onClick={(e) => handleSingleBookingClick(dayBookings[0], e)}
                >

                  {/* Info icon in top-right corner */}
                  <div className="absolute top-0.5 right-0.5">
                    <Info className="w-2.5 h-2.5 text-gray-700" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-white text-xs font-semibold">
                      {format(new Date(dayBookings[0].start_time), 'HH:mm')}
                    </div>
                  </div>
                  <div className="text-white/95 text-xs font-medium truncate mt-0.5">
                    {dayBookings[0].customer_name}
                  </div>
                  <div className="text-white/80 text-xs truncate">
                    {dayBookings[0].service_types?.name || dayBookings[0].service_name || 'Appointment'}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipPrimitive.Portal>
                <TooltipContent 
                  side="top" 
                  avoidCollisions={true}
                  className="max-w-xs bg-popover border border-border shadow-md rounded-lg p-3 z-[9999]"
                >
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-foreground">
                    {format(new Date(dayBookings[0].start_time), 'HH:mm')} - {dayBookings[0].customer_name}
                  </div>
                  <div className="space-y-0.5 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Calendar:</span>
                      <span className="text-foreground font-medium">{dayBookings[0].calendar?.name || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Person:</span>
                      <span className="text-foreground font-medium">{dayBookings[0].calendar?.users?.full_name || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service:</span>
                      <span className="text-foreground font-medium">{dayBookings[0].service_types?.name || dayBookings[0].service_name || 'Appointment'}</span>
                    </div>
                  </div>
                </div>
              </TooltipContent>
              </TooltipPrimitive.Portal>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {hasMultipleBookings && (
          <div 
            className="text-center py-2 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg border border-blue-500/20 hover:from-blue-500/15 hover:to-blue-500/10 hover:border-blue-500/30 transition-all duration-200 cursor-pointer group-hover:scale-105"
            onClick={handleMultipleBookingsClick}
          >
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
