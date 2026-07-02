
import { format, isSameMonth, isSameDay } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { dateFnsLocale } from '@/lib/dateLocale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { bookingChipStyle } from '../utils/bookingColor';

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
  const { t, i18n } = useTranslation('appPages');
  const locale = dateFnsLocale(i18n.language);
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

  const interactive = dayBookings.length > 0;

  return (
    <div
      {...(interactive
        ? {
            role: 'button',
            tabIndex: 0,
            'aria-label': dayBookings.length === 1
              ? t('calPage.dayCell.ariaOne', '{{count}} appointment on {{date}}', { count: dayBookings.length, date: format(day, 'EEEE d MMMM', { locale }) })
              : t('calPage.dayCell.ariaOther', '{{count}} appointments on {{date}}', { count: dayBookings.length, date: format(day, 'EEEE d MMMM', { locale }) }),
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onDayClick(day, dayBookings);
              }
            },
          }
        : {})}
      className={`group rounded-xl p-0.5 sm:p-1.5 min-h-[60px] sm:min-h-[80px] transition-colors duration-150 outline-none ${
        interactive ? 'cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset' : ''
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
          <div className="text-center py-0.5 sm:py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 motion-reduce:transition-none">
            {/* honest hover reveal: empty days have no click action, so this stays
                informational (no fake "add" affordance — R3 gate). */}
            <div className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">{t('calPage.dayCell.empty', 'No appointments')}</div>
            <div className="w-2 sm:w-3 h-px bg-border mx-auto"></div>
          </div>
        )}
        
        {hasSingleBooking && (
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div
                  className="group/booking relative cursor-pointer rounded-lg border-l-2 p-0.5 pl-1 transition-colors duration-150 hover:brightness-110 motion-reduce:transition-none sm:p-1 sm:pl-1.5"
                  style={bookingChipStyle(dayBookings[0].service_types?.color)}
                  onClick={(e) => handleSingleBookingClick(dayBookings[0], e)}
                >

                  {/* Info icon in top-right corner */}
                  <div className="absolute top-0 right-0 sm:top-0.5 sm:right-0.5">
                    <Info aria-hidden="true" className="h-1.5 w-1.5 text-subtle-foreground sm:h-2.5 sm:w-2.5" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-[9px] font-semibold tabular-nums text-foreground sm:text-xs">
                      {format(new Date(dayBookings[0].start_time), 'HH:mm')}
                    </div>
                  </div>
                  <div className="mt-0.5 truncate text-[9px] font-medium text-foreground sm:text-xs">
                    {dayBookings[0].customer_name}
                  </div>
                  <div className="truncate text-[8px] text-muted-foreground sm:text-xs">
                    {dayBookings[0].service_types?.name || dayBookings[0].service_name || t('calPage.weekView.tooltip.apptValue', 'Appointment')}
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
                      <span className="text-muted-foreground">{t('calPage.weekView.tooltip.calendar', 'Calendar:')}</span>
                      <span className="text-foreground font-medium">{dayBookings[0].calendar?.name || t('calPage.weekView.tooltip.unknownValue', 'Unknown')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('calPage.weekView.tooltip.person', 'Person:')}</span>
                      <span className="text-foreground font-medium">{dayBookings[0].calendar?.users?.full_name || t('calPage.weekView.tooltip.unknownValue', 'Unknown')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('calPage.weekView.tooltip.service', 'Service:')}</span>
                      <span className="text-foreground font-medium">{dayBookings[0].service_types?.name || dayBookings[0].service_name || t('calPage.weekView.tooltip.apptValue', 'Appointment')}</span>
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
            className="overflow-hidden text-center px-1 py-1 sm:py-2 bg-primary/10 rounded-lg ring-1 ring-primary/20 hover:bg-primary/[0.16] transition-colors duration-150 cursor-pointer"
            onClick={handleMultipleBookingsClick}
          >
            {/* Below sm, the cell is too narrow (~40px) to fit "N appointments" on one
                line without it visually overflowing into the next day's cell (found on a
                real mobile-viewport spot-check, R20); the count-only badge already shown
                at the top of the cell carries that information, so this line drops to just
                the count here and the full phrase returns at sm+ where there is room. */}
            <div className="truncate text-accent-foreground font-semibold text-[9px] sm:text-xs mb-0.5 tabular-nums">
              <span className="sm:hidden">{dayBookings.length}</span>
              <span className="hidden sm:inline">
                {t('calPage.dayCell.appointmentCount', '{{n}} appointment{{plural}}', { n: dayBookings.length, plural: dayBookings.length === 1 ? '' : 's' })}
              </span>
            </div>
            <div className="hidden sm:block truncate text-[8px] sm:text-xs text-accent-foreground">
              {t('calPage.dayCell.clickHint', 'Click for details')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
