
import { useState } from 'react';
import { format, startOfYear, endOfYear, eachMonthOfInterval, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Calendar, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { DayBookingsModal } from './DayBookingsModal';
import { BookingDetailModal } from './BookingDetailModal';

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

interface YearViewProps {
  bookings: Booking[];
  currentDate: Date;
}

export function YearView({ bookings, currentDate }: YearViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [bookingDetailOpen, setBookingDetailOpen] = useState(false);

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

  const handleDayClick = (day: Date, dayBookings: Booking[]) => {
    if (dayBookings.length === 1) {
      // Single appointment - show detailed modal directly
      setSelectedBooking(dayBookings[0]);
      setBookingDetailOpen(true);
    } else if (dayBookings.length > 1) {
      // Multiple appointments - show day modal first
      setSelectedDate(day);
      setDayModalOpen(true);
    }
  };

  const closeDayModal = () => {
    setDayModalOpen(false);
    setSelectedDate(null);
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
      <div className="group bg-card/80 backdrop-blur-sm border border-border/60 rounded-3xl p-4 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 hover:border-primary/30">
        <div className="text-center mb-4">
          <div className="text-lg font-bold text-foreground mb-1">
            {format(month, 'MMMM', { locale: enUS })}
          </div>
          <div className="flex items-center justify-center gap-2">
            <Calendar className="h-3 w-3 text-primary" />
            <span className="text-sm text-muted-foreground font-medium">
              {monthBookings} appointments
            </span>
          </div>
        </div>
        
        {/* Mini calendar grid */}
        <div className="space-y-1">
          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-xs text-muted-foreground text-center font-medium p-1">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map(day => {
              const dayBookings = getBookingsForDay(day);
              const isCurrentMonth = isSameMonth(day, month);
              const isToday = isSameDay(day, new Date());
              const hasBookings = dayBookings.length > 0;

              return (
                <div
                  key={day.toISOString()}
                  className={`text-xs text-center p-1.5 rounded-xl transition-all duration-150 ${
                    isCurrentMonth 
                      ? hasBookings 
                        ? 'bg-primary text-primary-foreground font-bold shadow-sm hover:shadow-md transform hover:scale-110 cursor-pointer' 
                        : isToday 
                          ? 'bg-accent text-primary font-bold border-2 border-primary/50' 
                          : 'text-foreground hover:bg-accent/50'
                      : 'text-muted-foreground/50'
                  }`}
                  title={hasBookings ? `${dayBookings.length} appointment${dayBookings.length > 1 ? 's' : ''}` : ''}
                  onClick={() => hasBookings && handleDayClick(day, dayBookings)}
                >
                  {format(day, 'd')}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-background via-card to-background/95 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {months.map(month => (
          <MiniMonth key={month.toISOString()} month={month} />
        ))}
      </div>
      
      {/* Year summary */}
      <div className="bg-card/90 backdrop-blur-sm border border-border/60 rounded-3xl p-8 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-primary/20 rounded-2xl">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-foreground">
              Year Overview {format(currentDate, 'yyyy')}
            </h3>
            <p className="text-muted-foreground">Complete statistics and performance</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20">
            <div className="flex items-center justify-center mb-2">
              <Calendar className="h-5 w-5 text-primary mr-2" />
            </div>
            <div className="text-3xl font-bold text-primary mb-1">{bookings.length}</div>
            <div className="text-sm text-muted-foreground font-medium">Total appointments</div>
          </div>
          
          <div className="text-center p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-2xl border border-green-500/20">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            </div>
            <div className="text-3xl font-bold text-green-600 mb-1">
              {bookings.filter(b => b.status === 'confirmed').length}
            </div>
            <div className="text-sm text-muted-foreground font-medium">Confirmed</div>
          </div>
          
          <div className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-2xl border border-blue-500/20">
            <div className="flex items-center justify-center mb-2">
              <Clock className="h-5 w-5 text-blue-600 mr-2" />
            </div>
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {bookings.filter(b => b.status === 'completed').length}
            </div>
            <div className="text-sm text-muted-foreground font-medium">Completed</div>
          </div>
          
          <div className="text-center p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-2xl border border-purple-500/20">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-5 w-5 text-purple-600 mr-2" />
            </div>
            <div className="text-3xl font-bold text-purple-600 mb-1">
              {Math.round((bookings.filter(b => b.status === 'completed').length / bookings.length) * 100) || 0}%
            </div>
            <div className="text-sm text-muted-foreground font-medium">Success rate</div>
          </div>
        </div>
      </div>

      <DayBookingsModal
        open={dayModalOpen}
        onClose={closeDayModal}
        date={selectedDate}
        bookings={selectedDate ? getBookingsForDay(selectedDate) : []}
      />

      <BookingDetailModal
        open={bookingDetailOpen}
        onClose={closeBookingDetail}
        booking={selectedBooking}
      />
    </div>
  );
}
