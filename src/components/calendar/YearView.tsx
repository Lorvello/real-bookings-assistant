
import { useState } from 'react';
import { format, startOfYear, endOfYear, eachMonthOfInterval, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Calendar, TrendingUp, CheckCircle, Clock, Info } from 'lucide-react';
import { DayBookingsModal } from './DayBookingsModal';
import { BookingDetailModal } from './BookingDetailModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

interface YearViewProps {
  bookings: Booking[];
  currentDate: Date;
  viewingAllCalendars?: boolean;
}

export function YearView({ bookings, currentDate, viewingAllCalendars = false }: YearViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [bookingDetailOpen, setBookingDetailOpen] = useState(false);
  const [modalPosition, setModalPosition] = useState<{ x: number; y: number } | undefined>(undefined);

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

  const handleDayClick = (day: Date, dayBookings: Booking[], event?: React.MouseEvent) => {
    if (dayBookings.length === 1) {
      // Single appointment - show detailed modal directly
      setSelectedBooking(dayBookings[0]);
      setBookingDetailOpen(true);
    } else if (dayBookings.length > 1) {
      // Multiple appointments - show day modal first
      if (event) {
        const rect = event.currentTarget.getBoundingClientRect();
        setModalPosition({
          x: rect.left + rect.width / 2,
          y: rect.top
        });
      }
      setSelectedDate(day);
      setDayModalOpen(true);
    }
  };

  const closeDayModal = () => {
    setDayModalOpen(false);
    setSelectedDate(null);
    setModalPosition(undefined);
  };

  const closeBookingDetail = () => {
    setBookingDetailOpen(false);
    setSelectedBooking(null);
  };

  const MiniMonth = ({ month }: { month: Date }) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const monthBookings = getBookingsCountForMonth(month);

    return (
      <div className="group bg-card/80 backdrop-blur-sm border border-border/60 rounded-3xl p-2 sm:p-4 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 hover:border-primary/30">
        <div className="text-center mb-2 sm:mb-4">
          <div className="text-sm sm:text-lg font-bold text-foreground mb-1">
            {format(month, 'MMMM', { locale: enUS })}
          </div>
          <div className="flex items-center justify-center gap-1 sm:gap-2">
            <Calendar className="h-2 w-2 sm:h-3 sm:w-3 text-primary" />
            <span className="text-xs sm:text-sm text-muted-foreground font-medium">
              {monthBookings} appointments
            </span>
          </div>
        </div>
        
        {/* Mini calendar grid */}
        <div className="space-y-1">
          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-1 sm:mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-[9px] sm:text-xs text-muted-foreground text-center font-medium p-0.5 sm:p-1">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {days.map(day => {
              const dayBookings = getBookingsForDay(day);
              const isCurrentMonth = isSameMonth(day, month);
              const isToday = isSameDay(day, new Date());
              const hasBookings = dayBookings.length > 0;

              const handleDayClickEvent = (event: React.MouseEvent) => {
                if (hasBookings) {
                  handleDayClick(day, dayBookings, event);
                }
              };

              if (hasBookings && dayBookings.length === 1) {
                // Single booking - show detailed tooltip
                return (
                  <TooltipProvider key={day.toISOString()}>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <div
                          className={`text-[9px] sm:text-xs text-center p-0.5 sm:p-1.5 rounded-xl transition-all duration-150 relative ${
                            isCurrentMonth 
                              ? 'bg-primary text-primary-foreground font-bold shadow-sm hover:shadow-md transform hover:scale-110 cursor-pointer'
                              : 'text-muted-foreground/50'
                          }`}
                          onClick={handleDayClickEvent}
                        >
                          {/* Info icon */}
                          <div className="absolute top-0 sm:top-0.5 right-0 sm:right-0.5">
                            <Info className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-gray-700" />
                          </div>
                          {format(day, 'd')}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent 
                        side="top" 
                        className="max-w-xs bg-popover border border-border shadow-md rounded-lg p-3"
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
                    </Tooltip>
                  </TooltipProvider>
                );
              } else {
                // No booking or multiple bookings - show regular day cell
                return (
                  <div
                    key={day.toISOString()}
                    className={`text-[9px] sm:text-xs text-center p-0.5 sm:p-1.5 rounded-xl transition-all duration-150 ${
                      isCurrentMonth 
                        ? hasBookings 
                          ? 'bg-primary text-primary-foreground font-bold shadow-sm hover:shadow-md transform hover:scale-110 cursor-pointer' 
                          : isToday 
                            ? 'bg-accent text-primary font-bold border-2 border-primary/50' 
                            : 'text-foreground hover:bg-accent/50'
                        : 'text-muted-foreground/50'
                    }`}
                    title={hasBookings ? `${dayBookings.length} appointment${dayBookings.length > 1 ? 's' : ''}` : ''}
                    onClick={handleDayClickEvent}
                  >
                    {format(day, 'd')}
                  </div>
                );
              }
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-background via-card to-background/95 p-2 sm:p-6">
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-6 mb-4 sm:mb-8">
        {months.map(month => (
          <MiniMonth key={month.toISOString()} month={month} />
        ))}
      </div>
      
      {/* Year summary */}
      <div className="bg-card/90 backdrop-blur-sm border border-border/60 rounded-3xl p-3 sm:p-8 shadow-lg">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-6">
          <div className="p-1.5 sm:p-3 bg-primary/20 rounded-2xl">
            <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg sm:text-2xl font-bold text-foreground">
              Year Overview {format(currentDate, 'yyyy')}
            </h3>
            <p className="text-xs sm:text-base text-muted-foreground">Complete statistics and performance</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
          <div className="text-center p-2 sm:p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20">
            <div className="flex items-center justify-center mb-1 sm:mb-2">
              <Calendar className="h-3 w-3 sm:h-5 sm:w-5 text-primary mr-1 sm:mr-2" />
            </div>
            <div className="text-lg sm:text-3xl font-bold text-primary mb-0.5 sm:mb-1">{bookings.length}</div>
            <div className="text-xs sm:text-sm text-muted-foreground font-medium">Total appointments</div>
          </div>
          
          <div className="text-center p-2 sm:p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-2xl border border-green-500/20">
            <div className="flex items-center justify-center mb-1 sm:mb-2">
              <CheckCircle className="h-3 w-3 sm:h-5 sm:w-5 text-green-600 mr-1 sm:mr-2" />
            </div>
            <div className="text-lg sm:text-3xl font-bold text-green-600 mb-0.5 sm:mb-1">
              {bookings.filter(b => b.status === 'confirmed').length}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground font-medium">Confirmed</div>
          </div>
          
          <div className="text-center p-2 sm:p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-2xl border border-blue-500/20">
            <div className="flex items-center justify-center mb-1 sm:mb-2">
              <Clock className="h-3 w-3 sm:h-5 sm:w-5 text-blue-600 mr-1 sm:mr-2" />
            </div>
            <div className="text-lg sm:text-3xl font-bold text-blue-600 mb-0.5 sm:mb-1">
              {bookings.filter(b => b.status === 'completed').length}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground font-medium">Completed</div>
          </div>
          
          <div className="text-center p-2 sm:p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-2xl border border-purple-500/20">
            <div className="flex items-center justify-center mb-1 sm:mb-2">
              <TrendingUp className="h-3 w-3 sm:h-5 sm:w-5 text-purple-600 mr-1 sm:mr-2" />
            </div>
            <div className="text-lg sm:text-3xl font-bold text-purple-600 mb-0.5 sm:mb-1">
              {Math.round((bookings.filter(b => b.status === 'completed').length / bookings.length) * 100) || 0}%
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground font-medium">Success rate</div>
          </div>
        </div>
      </div>

      <DayBookingsModal
        open={dayModalOpen}
        onClose={closeDayModal}
        date={selectedDate}
        bookings={selectedDate ? getBookingsForDay(selectedDate) : []}
        position={modalPosition}
      />

      <BookingDetailModal
        open={bookingDetailOpen}
        onClose={closeBookingDetail}
        booking={selectedBooking}
        viewingAllCalendars={viewingAllCalendars}
      />
    </div>
  );
}
