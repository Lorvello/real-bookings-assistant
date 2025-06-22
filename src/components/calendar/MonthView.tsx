
import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { nl } from 'date-fns/locale';
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

interface MonthViewProps {
  bookings: Booking[];
  currentDate: Date;
}

export function MonthView({ bookings, currentDate }: MonthViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingDetailOpen, setBookingDetailOpen] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];

  const getBookingsForDay = (day: Date) => {
    return bookings.filter(booking => 
      isSameDay(new Date(booking.start_time), day)
    );
  };

  const handleDayClick = (day: Date, dayBookings: Booking[]) => {
    if (dayBookings.length > 1) {
      setSelectedDate(day);
      setModalOpen(true);
    }
  };

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setBookingDetailOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedDate(null);
  };

  const closeBookingDetail = () => {
    setBookingDetailOpen(false);
    setSelectedBooking(null);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-card to-background/95">
      {/* Fixed Week day headers */}
      <div className="flex-shrink-0 bg-card/90 backdrop-blur-sm rounded-3xl mx-6 mt-6 p-4 shadow-sm border border-border/40 sticky top-0 z-20">
        <div className="grid grid-cols-7">
          {weekDays.map(day => (
            <div key={day} className="text-center py-3">
              <div className="text-sm font-semibold text-foreground">{day.slice(0, 2).toUpperCase()}</div>
              <div className="text-xs text-muted-foreground mt-1">{day.slice(2)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable Calendar grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 pt-3">
          <div className="grid grid-cols-7 gap-3">
            {days.map(day => {
              const dayBookings = getBookingsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());
              const hasMultipleBookings = dayBookings.length > 1;

              return (
                <div
                  key={day.toISOString()}
                  className={`group rounded-3xl p-4 min-h-[140px] transition-all duration-200 hover:shadow-lg ${
                    hasMultipleBookings ? 'cursor-pointer' : ''
                  } ${
                    isCurrentMonth 
                      ? isToday
                        ? 'bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border-2 border-primary/40 shadow-lg shadow-primary/10'
                        : 'bg-card/90 backdrop-blur-sm border border-border/60 hover:border-primary/30 hover:bg-card/95'
                      : 'bg-muted/30 border border-border/30 opacity-60'
                  }`}
                  onClick={() => handleDayClick(day, dayBookings)}
                >
                  <div className={`flex items-center justify-between mb-3 ${
                    isToday ? 'text-primary font-bold' : 'text-foreground'
                  }`}>
                    <div className={`text-lg font-bold ${
                      isToday 
                        ? 'bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-lg' 
                        : ''
                    }`}>
                      {format(day, 'd')}
                    </div>
                    {dayBookings.length > 0 && (
                      <div className="text-xs bg-blue-500/20 text-blue-600 px-2 py-1 rounded-full font-medium">
                        {dayBookings.length}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {/* Toon afspraken anders afhankelijk van het aantal */}
                    {dayBookings.length === 0 && isCurrentMonth && (
                      <div className="text-center py-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="text-xs text-muted-foreground mb-1">Geen afspraken</div>
                        <div className="w-6 h-px bg-border mx-auto"></div>
                      </div>
                    )}
                    
                    {dayBookings.length === 1 && (
                      <div
                        className="group/booking p-2.5 rounded-2xl cursor-pointer hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md"
                        style={{
                          backgroundColor: dayBookings[0].service_types?.color || '#3B82F6',
                          backgroundImage: `linear-gradient(135deg, ${dayBookings[0].service_types?.color || '#3B82F6'}, ${dayBookings[0].service_types?.color || '#3B82F6'}dd)`
                        }}
                        title={`${format(new Date(dayBookings[0].start_time), 'HH:mm')} - ${dayBookings[0].customer_name} (${dayBookings[0].service_types?.name || dayBookings[0].service_name || 'Afspraak'})`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBookingClick(dayBookings[0]);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-white text-xs font-semibold">
                            {format(new Date(dayBookings[0].start_time), 'HH:mm')}
                          </div>
                          <div className={`w-2 h-2 rounded-full ${
                            dayBookings[0].status === 'confirmed' ? 'bg-white/90' :
                            dayBookings[0].status === 'pending' ? 'bg-yellow-300/90' :
                            'bg-red-300/90'
                          }`} />
                        </div>
                        <div className="text-white/95 text-xs font-medium truncate mt-1">
                          {dayBookings[0].customer_name}
                        </div>
                        <div className="text-white/80 text-xs truncate">
                          {dayBookings[0].service_types?.name || dayBookings[0].service_name || 'Afspraak'}
                        </div>
                      </div>
                    )}
                    
                    {dayBookings.length > 1 && (
                      <div className="text-center py-6 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-2xl border border-blue-500/20 hover:from-blue-500/15 hover:to-blue-500/10 hover:border-blue-500/30 transition-all duration-200 cursor-pointer group-hover:scale-105">
                        <div className="text-blue-600 font-semibold text-sm mb-1">
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
            })}
          </div>
        </div>
      </div>

      <DayBookingsModal
        open={modalOpen}
        onClose={closeModal}
        date={selectedDate}
        bookings={selectedDate ? getBookingsForDay(selectedDate) : []}
        onBookingClick={handleBookingClick}
      />

      <BookingDetailModal
        open={bookingDetailOpen}
        onClose={closeBookingDetail}
        booking={selectedBooking}
      />
    </div>
  );
}
