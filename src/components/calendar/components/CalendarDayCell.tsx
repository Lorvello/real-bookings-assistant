
import { format, isSameMonth, isSameDay } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Plus } from 'lucide-react';
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
      className={`group rounded-xl p-0.5 sm:p-1.5 min-h-[60px] sm:min-h-[80px] transition-colors duration-150 ${
        dayBookings.length > 0 ? 'cursor-pointer' : ''
      } ${
        isCurrentMonth
          ? isToday
            ? 'ring-1 ring-inset ring-white/15 hover:bg-white/[0.04]'
            : 'hover:bg-white/[0.04]'
          : 'opacity-40'
      }`}
      onClick={handleDayCellClick}
    >
      <div className="flex items-center justify-between mb-0.5 sm:mb-1">
        <div className={`text-xs sm:text-sm font-semibold tabular-nums ${
          isToday
            ? 'bg-primary text-primary-foreground w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[10px] sm:text-xs'
            : 'text-foreground'
        }`}>
          {format(day, 'd')}
        </div>
        {dayBookings.length > 0 && (
          <div className="text-[10px] sm:text-xs bg-primary/10 text-accent-foreground ring-1 ring-primary/20 px-1 py-0.5 rounded-full font-medium tabular-nums">
            {dayBookings.length}
          </div>
        )}
      </div>
      
      <div className="space-y-0.5">
        {/* Show appointments differently based on count */}
        {dayBookings.length === 0 && isCurrentMonth && (
          <div className="flex justify-center py-0.5 sm:py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {/* contextual "add" affordance surfaces on hover (MEGA_PLAN §2.A) */}
            <span className="flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-primary/10 text-accent-foreground ring-1 ring-primary/20">
              <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            </span>
          </div>
        )}
        
        {hasSingleBooking && (
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div
                  className="group/booking p-0.5 sm:p-1 rounded-lg cursor-pointer hover:brightness-110 transition-[filter] duration-150 relative"
                  style={{
                    backgroundColor: dayBookings[0].service_types?.color || 'hsl(var(--primary))'
                  }}
                  onClick={(e) => handleSingleBookingClick(dayBookings[0], e)}
                >

                  {/* Info icon in top-right corner */}
                  <div className="absolute top-0 sm:top-0.5 right-0 sm:right-0.5">
                    <Info className="w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 text-subtle-foreground" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-foreground text-[9px] sm:text-xs font-semibold tabular-nums">
                      {format(new Date(dayBookings[0].start_time), 'HH:mm')}
                    </div>
                  </div>
                  <div className="text-foreground/95 text-[9px] sm:text-xs font-medium truncate mt-0.5">
                    {dayBookings[0].customer_name}
                  </div>
                  <div className="text-foreground/80 text-[8px] sm:text-xs truncate">
                    {dayBookings[0].service_types?.name || dayBookings[0].service_name || 'Appointment'}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipPrimitive.Portal>
                <TooltipContent 
                  side="top" 
                  avoidCollisions={true}
                  className="max-w-xs glass rounded-lg p-3 z-[9999]"
                >
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-foreground tabular-nums">
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
            className="text-center py-1 sm:py-2 bg-primary/10 rounded-lg ring-1 ring-primary/20 hover:bg-primary/[0.16] transition-colors duration-150 cursor-pointer"
            onClick={handleMultipleBookingsClick}
          >
            <div className="text-accent-foreground font-semibold text-[9px] sm:text-xs mb-0.5 tabular-nums">
              {dayBookings.length} appointments
            </div>
            <div className="text-[8px] sm:text-xs text-accent-foreground/70">
              Click for details
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
