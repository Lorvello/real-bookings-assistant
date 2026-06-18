
import { useState } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { BookingDetailModal } from './BookingDetailModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { bookingChipStyle, resolveBookingColor } from './utils/bookingColor';

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
  calendar?: {
    id?: string;
    name: string;
    color: string;
    user_id?: string;
    users?: {
      full_name: string;
    };
  };
  service_types?: {
    name: string;
    color: string;
    duration: number;
    description?: string;
  } | null;
}

interface WeekViewProps {
  bookings: Booking[];
  currentDate: Date;
  timeRange?: { startTime: string; endTime: string };
  viewingAllCalendars?: boolean;
}

// Helper functions
const generateTimeSlots = (startTime: string, endTime: string, intervalMinutes: number) => {
  const slots = [];
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;

  for (let totalMinutes = startTotalMinutes; totalMinutes <= endTotalMinutes; totalMinutes += intervalMinutes) {
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    slots.push(timeString);
  }
  return slots;
};

const getWeekDays = (currentDate: Date) => {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: weekStart, end: weekEnd });
};

// Get bookings that START in a specific time slot (avoids duplicates across slots)
const getBookingsStartingInTimeSlot = (bookings: Booking[], day: Date, timeSlot: string) => {
  const [hours, minutes] = timeSlot.split(':').map(Number);
  const slotStart = new Date(day);
  slotStart.setHours(hours, minutes, 0, 0);
  const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000); // 30 minutes later

  return bookings.filter(booking => {
    const bookingStart = new Date(booking.start_time);
    return (
      isSameDay(bookingStart, day) &&
      bookingStart >= slotStart &&
      bookingStart < slotEnd
    );
  });
};

// Pixel positioning relative to the base 30-min slot
const calculateBookingPosition = (booking: Booking, baseTimeSlot: string) => {
  const startTime = new Date(booking.start_time);
  const endTime = new Date(booking.end_time);
  const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes

  const [baseHours, baseMinutes] = baseTimeSlot.split(':').map(Number);
  const baseSlotMinutes = baseHours * 60 + baseMinutes;

  const bookingTotalMinutes = startTime.getHours() * 60 + startTime.getMinutes();
  const offsetMinutes = bookingTotalMinutes - baseSlotMinutes;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const baseUnit = isMobile ? 28 : 40; // height of one 30-min slot
  const minHeight = isMobile ? 28 : 44;

  const topOffset = Math.max(0, (offsetMinutes / 30) * baseUnit);
  const height = Math.max(minHeight, (duration / 30) * baseUnit);

  return { topOffset, height };
};

// Booking block — contrast-safe accent chip
function BookingBlock({ booking, timeSlot, onBookingClick }: { booking: Booking; timeSlot: string; onBookingClick: (booking: Booking) => void }) {
  const { topOffset, height } = calculateBookingPosition(booking, timeSlot);
  const startTime = new Date(booking.start_time);
  const endTime = new Date(booking.end_time);
  const accent = resolveBookingColor(booking.service_types?.color);

  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            aria-label={`${booking.customer_name}, ${booking.service_types?.name || 'Appointment'}, ${format(startTime, 'HH:mm')} to ${format(endTime, 'HH:mm')}`}
            className="group absolute inset-x-0 z-10 mx-0.5 cursor-pointer overflow-hidden rounded-md border-l-2 p-1 outline-none transition-colors duration-150 hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background sm:mx-1 sm:p-2"
            style={{
              ...bookingChipStyle(booking.service_types?.color),
              height: `${height}px`,
              top: `${topOffset}px`,
              boxShadow: `0 1px 6px color-mix(in srgb, ${accent} 35%, transparent)`,
            }}
            onClick={() => onBookingClick(booking)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onBookingClick(booking);
              }
            }}
          >
            {/* Info icon in top-right corner */}
            <div className="absolute right-0.5 top-0.5 sm:right-1 sm:top-1">
              <Info aria-hidden="true" className="h-2 w-2 text-subtle-foreground sm:h-3 sm:w-3" />
            </div>

            <div className="overflow-hidden text-foreground">
              <div className="mb-0.5 truncate text-[9px] font-semibold sm:mb-1 sm:text-xs">{booking.customer_name}</div>
              <div className="mb-0.5 truncate text-[8px] font-medium text-muted-foreground sm:mb-1 sm:text-xs">
                {booking.service_types?.name || 'Appointment'}
              </div>
              <div className="truncate text-[8px] tabular-nums text-muted-foreground sm:text-xs">
                {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs glass rounded-lg p-3">
          <div className="space-y-1.5">
            <div className="text-xs font-semibold tabular-nums text-foreground">
              {format(new Date(booking.start_time), 'HH:mm')} - {booking.customer_name}
            </div>
            <div className="space-y-0.5 text-[10px]">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Calendar:</span>
                <span className="font-medium text-foreground">{booking.calendar?.name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Person:</span>
                <span className="font-medium text-foreground">{booking.calendar?.users?.full_name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Service:</span>
                <span className="font-medium text-foreground">{booking.service_types?.name || booking.service_name || 'Appointment'}</span>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function WeekView({ bookings, currentDate, timeRange, viewingAllCalendars = false }: WeekViewProps) {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingDetailOpen, setBookingDetailOpen] = useState(false);

  const weekDays = getWeekDays(currentDate);

  const startTime = timeRange?.startTime || '08:00';
  const endTime = timeRange?.endTime || '18:00';
  const timeSlots = generateTimeSlots(startTime, endTime, 30);

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setBookingDetailOpen(true);
  };

  const closeBookingDetail = () => {
    setBookingDetailOpen(false);
    setSelectedBooking(null);
  };

  return (
    <div className="h-full overflow-auto bg-background">
      {/* min-width forces horizontal scroll on phones so columns stay readable;
          natural width on sm+ (the week fits the card). */}
      <div className="min-w-[680px] sm:min-w-0">
        {/* Sticky day header */}
        <div className="sticky top-0 z-20 border-b border-white/[0.06] bg-card/95 backdrop-blur-sm">
          <div className="grid grid-cols-8">
            <div className="sticky left-0 z-30 w-14 border-r border-white/[0.06] bg-card/95 p-2 sm:w-16">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-subtle-foreground sm:text-xs">Time</div>
            </div>
            {weekDays.map((day, idx) => (
              <div
                key={day.toISOString()}
                className={`px-0.5 py-2 text-center transition-colors duration-150 sm:px-1 ${
                  idx < weekDays.length - 1 ? 'border-r border-white/[0.06]' : ''
                } ${isToday(day) ? 'bg-primary/10' : ''}`}
              >
                <div className="text-[9px] font-medium text-muted-foreground sm:text-xs">{format(day, 'EEE')}</div>
                <div className={`mt-0.5 text-sm font-semibold tabular-nums sm:text-lg ${isToday(day) ? 'text-primary' : 'text-foreground'}`}>
                  {format(day, 'd')}
                </div>
                <div className="text-[9px] text-muted-foreground sm:text-xs">{format(day, 'MMM')}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable time grid */}
        <div className="relative">
          {timeSlots.map((timeSlot, index) => (
            <div
              key={timeSlot}
              className={`grid grid-cols-8 border-b border-white/[0.05] ${index % 2 === 0 ? 'bg-white/[0.015]' : ''}`}
            >
              {/* Time label — sticky left gutter */}
              <div className="sticky left-0 z-10 w-14 border-r border-white/[0.06] bg-card px-1 py-1 text-right text-[9px] font-medium tabular-nums text-muted-foreground sm:w-16 sm:px-2 sm:py-2 sm:text-xs">
                {timeSlot}
              </div>

              {/* Day columns */}
              {weekDays.map((day, idx) => {
                const dayBookings = getBookingsStartingInTimeSlot(bookings, day, timeSlot);

                return (
                  <div
                    key={`${day.toISOString()}-${timeSlot}`}
                    className={`relative min-h-[28px] transition-colors sm:min-h-[40px] ${
                      idx < weekDays.length - 1 ? 'border-r border-white/[0.05]' : ''
                    } ${isToday(day) ? 'bg-primary/[0.06] hover:bg-primary/10' : 'hover:bg-white/[0.03]'}`}
                  >
                    {dayBookings.map((booking) => (
                      <BookingBlock
                        key={booking.id}
                        booking={booking}
                        timeSlot={timeSlot}
                        onBookingClick={handleBookingClick}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <BookingDetailModal
        open={bookingDetailOpen}
        onClose={closeBookingDetail}
        booking={selectedBooking}
        viewingAllCalendars={viewingAllCalendars}
      />
    </div>
  );
}
