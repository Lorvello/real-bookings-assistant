
import { useState } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { BookingDetailModal } from './BookingDetailModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

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

// Fixed function to get bookings that START in a specific time slot
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

// Fixed positioning calculation
const calculateBookingPosition = (booking: Booking, baseTimeSlot: string) => {
  const startTime = new Date(booking.start_time);
  const endTime = new Date(booking.end_time);
  const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes
  
  // Calculate top offset from the base time slot
  const [baseHours, baseMinutes] = baseTimeSlot.split(':').map(Number);
  const baseSlotMinutes = baseHours * 60 + baseMinutes;
  
  const bookingHours = startTime.getHours();
  const bookingMinutes = startTime.getMinutes();
  const bookingTotalMinutes = bookingHours * 60 + bookingMinutes;
  
  const offsetMinutes = bookingTotalMinutes - baseSlotMinutes;
  const baseOffset = window.innerWidth < 640 ? 24 : 40;
  const topOffset = Math.max(0, (offsetMinutes / 30) * baseOffset); // 30 min = 40px on desktop, 24px on mobile
  
  // Calculate height based on duration - 30 minutes = 40px height on desktop, 24px on mobile
  const baseHeight = window.innerWidth < 640 ? 24 : 40;
  const minHeight = window.innerWidth < 640 ? 24 : 44;
  const height = Math.max(minHeight, (duration / 30) * baseHeight);
  
  return { topOffset, height };
};

// Booking Block Component - more compact
function BookingBlock({ booking, timeSlot, onBookingClick }: { booking: Booking; timeSlot: string; onBookingClick: (booking: Booking) => void }) {
  const { topOffset, height } = calculateBookingPosition(booking, timeSlot);
  const startTime = new Date(booking.start_time);
  const endTime = new Date(booking.end_time);

  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div
            className="absolute inset-x-0 mx-0.5 sm:mx-1 p-1 sm:p-2 rounded-lg cursor-pointer hover:shadow-lg transition-all duration-200 z-10 group hover:scale-105 border border-white/20 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${booking.service_types?.color || '#3B82F6'}, ${booking.service_types?.color || '#3B82F6'}dd)`,
              height: `${height}px`,
              top: `${topOffset}px`,
              boxShadow: `0 2px 10px ${booking.service_types?.color || '#3B82F6'}40`
            }}
            onClick={() => onBookingClick(booking)}
          >
            {/* Info icon in top-right corner */}
            <div className="absolute top-0.5 sm:top-1 right-0.5 sm:right-1">
              <Info className="w-2 h-2 sm:w-3 sm:h-3 text-gray-700" />
            </div>

            <div className="text-white overflow-hidden">
              <div className="font-bold text-[9px] sm:text-xs truncate mb-0.5 sm:mb-1">{booking.customer_name}</div>
              <div className="text-white/90 text-[8px] sm:text-xs font-medium truncate mb-0.5 sm:mb-1">
                {booking.service_types?.name || 'Appointment'}
              </div>
              <div className="text-white/80 text-[8px] sm:text-xs truncate">
                {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-xs bg-popover border border-border shadow-md rounded-lg p-3"
        >
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-foreground">
              {format(new Date(booking.start_time), 'HH:mm')} - {booking.customer_name}
            </div>
            <div className="space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Calendar:</span>
                <span className="text-foreground font-medium">{booking.calendar?.name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Person:</span>
                <span className="text-foreground font-medium">{booking.calendar?.users?.full_name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service:</span>
                <span className="text-foreground font-medium">{booking.service_types?.name || booking.service_name || 'Appointment'}</span>
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
  
  // Use custom time range or default to business hours
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
      {/* Fixed header with days - more compact */}
      <div className="sticky top-0 z-20 bg-card border-b-2 border-border shadow-sm">
        <div className="grid grid-cols-8">
          <div className="w-8 sm:w-16 p-1 sm:p-2 border-r border-border">
            <div className="text-[10px] sm:text-xs font-semibold text-muted-foreground">Time</div>
          </div>
          {weekDays.map((day, idx) => (
            <div key={day.toISOString()} className={`text-center py-1 sm:py-2 px-0.5 sm:px-1 transition-all duration-200 ${
              idx < weekDays.length - 1 ? 'border-r border-border' : ''
            } ${
              isToday(day) 
                ? 'bg-primary/15' 
                : ''
            }`}>
              <div className="text-[9px] sm:text-xs text-muted-foreground font-medium">
                {format(day, 'EEE')}
              </div>
              <div className={`text-sm sm:text-lg font-bold mt-0.5 ${
                isToday(day) ? 'text-primary' : 'text-foreground'
              }`}>
                {format(day, 'd')}
              </div>
              <div className="text-[9px] sm:text-xs text-muted-foreground">
                {format(day, 'MMM')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable time grid - more compact */}
      <div className="relative">
        {/* Time slots */}
        {timeSlots.map((timeSlot, index) => (
          <div key={timeSlot} className={`grid grid-cols-8 border-b border-border ${
            index % 2 === 0 ? 'bg-muted/20' : 'bg-card'
          }`}>
            {/* Time label */}
            <div className="w-8 sm:w-16 py-1 sm:py-2 px-1 sm:px-2 text-[9px] sm:text-xs font-medium text-muted-foreground text-right border-r border-border bg-card">
              {timeSlot}
            </div>
            
            {/* Day columns */}
            {weekDays.map((day, idx) => {
              // Only get bookings that START in this time slot to avoid duplicates
              const dayBookings = getBookingsStartingInTimeSlot(bookings, day, timeSlot);
              
              return (
                <div
                  key={`${day.toISOString()}-${timeSlot}`}
                  className={`relative transition-colors min-h-[24px] sm:min-h-[40px] ${
                    idx < weekDays.length - 1 ? 'border-r border-border' : ''
                  } ${
                    isToday(day) 
                      ? 'bg-primary/10 hover:bg-primary/15' 
                      : 'hover:bg-accent/40'
                  }`}
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

      <BookingDetailModal
        open={bookingDetailOpen}
        onClose={closeBookingDetail}
        booking={selectedBooking}
        viewingAllCalendars={viewingAllCalendars}
      />
    </div>
  );
}
