
import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, isToday } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Calendar, Clock, User, Phone } from 'lucide-react';
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

interface ModernMonthViewProps {
  bookings: Booking[];
  currentDate: Date;
}

// Enhanced sample bookings generator - more diverse and distributed
const generateSampleBookings = (currentDate: Date): Booking[] => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  
  console.log('Generating sample bookings for:', format(monthStart, 'MMMM yyyy', { locale: nl }));
  
  const sampleBookings: Booking[] = [
    // Week 1 - Early in month
    {
      id: 'sample-1',
      start_time: new Date(year, month, 2, 9, 0).toISOString(),
      end_time: new Date(year, month, 2, 10, 30).toISOString(),
      customer_name: 'Emma van Berg',
      customer_phone: '+31612345678',
      customer_email: 'emma@example.com',
      status: 'confirmed',
      service_name: 'Kapperszaak',
      service_types: {
        name: 'Knippen & Stylen',
        color: '#FF6B6B',
        duration: 90
      }
    },
    {
      id: 'sample-2',
      start_time: new Date(year, month, 3, 14, 0).toISOString(),
      end_time: new Date(year, month, 3, 15, 0).toISOString(),
      customer_name: 'Joris Petersen',
      customer_phone: '+31687654321',
      customer_email: 'joris@example.com',
      status: 'confirmed',
      service_name: 'Fysiotherapie',
      service_types: {
        name: 'Rugbehandeling',
        color: '#4ECDC4',
        duration: 60
      }
    },
    {
      id: 'sample-3',
      start_time: new Date(year, month, 4, 16, 30).toISOString(),
      end_time: new Date(year, month, 4, 17, 30).toISOString(),
      customer_name: 'Lisa de Wit',
      customer_email: 'lisa@example.com',
      status: 'confirmed',
      service_name: 'Coaching',
      service_types: {
        name: 'Life Coaching Sessie',
        color: '#95E1D3',
        duration: 60
      }
    },
    {
      id: 'sample-4',
      start_time: new Date(year, month, 5, 11, 0).toISOString(),
      end_time: new Date(year, month, 5, 12, 0).toISOString(),
      customer_name: 'Ahmed Hassan',
      customer_phone: '+31667890123',
      customer_email: 'ahmed@example.com',
      status: 'pending',
      service_name: 'Barbier',
      service_types: {
        name: 'Baard Trimmen',
        color: '#FADBD8',
        duration: 60
      }
    },
    
    // Week 2 - More appointments
    {
      id: 'sample-5',
      start_time: new Date(year, month, 8, 10, 0).toISOString(),
      end_time: new Date(year, month, 8, 11, 30).toISOString(),
      customer_name: 'Mark Johnson',
      customer_phone: '+31634567890',
      customer_email: 'mark@example.com',
      status: 'confirmed',
      service_name: 'Tandarts',
      service_types: {
        name: 'Controle & Reiniging',
        color: '#A8E6CF',
        duration: 90
      }
    },
    {
      id: 'sample-6',
      start_time: new Date(year, month, 9, 13, 0).toISOString(),
      end_time: new Date(year, month, 9, 14, 0).toISOString(),
      customer_name: 'Sophie Bakker',
      customer_email: 'sophie@example.com',
      status: 'confirmed',
      service_name: 'Nagelsalon',
      service_types: {
        name: 'Manicure & Gellak',
        color: '#FFB6C1',
        duration: 60
      }
    },
    {
      id: 'sample-7',
      start_time: new Date(year, month, 10, 15, 30).toISOString(),
      end_time: new Date(year, month, 10, 16, 30).toISOString(),
      customer_name: 'David Rodriguez',
      customer_phone: '+31623456789',
      customer_email: 'david@example.com',
      status: 'confirmed',
      service_name: 'Personal Training',
      service_types: {
        name: 'Fitness Coaching',
        color: '#F39C12',
        duration: 60
      }
    },
    {
      id: 'sample-8',
      start_time: new Date(year, month, 11, 9, 0).toISOString(),
      end_time: new Date(year, month, 11, 10, 0).toISOString(),
      customer_name: 'Priya Sharma',
      customer_email: 'priya@example.com',
      status: 'confirmed',
      service_name: 'Yoga',
      service_types: {
        name: 'Private Yoga Sessie',
        color: '#D7BDE2',
        duration: 60
      }
    },
    {
      id: 'sample-9',
      start_time: new Date(year, month, 12, 14, 0).toISOString(),
      end_time: new Date(year, month, 12, 15, 0).toISOString(),
      customer_name: 'Thomas van Dijk',
      customer_phone: '+31656789012',
      customer_email: 'thomas@example.com',
      status: 'confirmed',
      service_name: 'Acupunctuur',
      service_types: {
        name: 'Behandeling',
        color: '#85C1E9',
        duration: 60
      }
    },
    
    // Week 3 - Multiple appointments per day
    {
      id: 'sample-10',
      start_time: new Date(year, month, 15, 11, 0).toISOString(),
      end_time: new Date(year, month, 15, 12, 0).toISOString(),
      customer_name: 'Anna Kowalski',
      customer_email: 'anna@example.com',
      status: 'confirmed',
      service_name: 'Massage',
      service_types: {
        name: 'Ontspanningsmassage',
        color: '#BB8FCE',
        duration: 60
      }
    },
    {
      id: 'sample-11',
      start_time: new Date(year, month, 16, 9, 30).toISOString(),
      end_time: new Date(year, month, 16, 10, 30).toISOString(),
      customer_name: 'Lars Nielsen',
      customer_phone: '+31634567812',
      customer_email: 'lars@example.com',
      status: 'confirmed',
      service_name: 'Psycholoog',
      service_types: {
        name: 'Gesprekstherapie',
        color: '#F7DC6F',
        duration: 60
      }
    },
    
    // Day with multiple bookings
    {
      id: 'sample-12',
      start_time: new Date(year, month, 17, 10, 0).toISOString(),
      end_time: new Date(year, month, 17, 11, 0).toISOString(),
      customer_name: 'Maria Santos',
      customer_email: 'maria@example.com',
      status: 'confirmed',
      service_name: 'Schoonheidsbehandeling',
      service_types: {
        name: 'Gezichtsbehandeling',
        color: '#F8C471',
        duration: 60
      }
    },
    {
      id: 'sample-13',
      start_time: new Date(year, month, 17, 14, 0).toISOString(),
      end_time: new Date(year, month, 17, 15, 0).toISOString(),
      customer_name: 'Robert Chen',
      customer_phone: '+31645678901',
      customer_email: 'robert@example.com',
      status: 'confirmed',
      service_name: 'Diëtist',
      service_types: {
        name: 'Voedingsadvies',
        color: '#82E0AA',
        duration: 60
      }
    },
    {
      id: 'sample-14',
      start_time: new Date(year, month, 17, 16, 30).toISOString(),
      end_time: new Date(year, month, 17, 17, 30).toISOString(),
      customer_name: 'Fatima Al-Zahra',
      customer_email: 'fatima@example.com',
      status: 'pending',
      service_name: 'Yoga',
      service_types: {
        name: 'Private Yoga Sessie',
        color: '#D7BDE2',
        duration: 60
      }
    },
    
    // Week 4 & End of month
    {
      id: 'sample-15',
      start_time: new Date(year, month, 22, 13, 30).toISOString(),
      end_time: new Date(year, month, 22, 14, 30).toISOString(),
      customer_name: 'Isabella Ferrari',
      customer_email: 'isabella@example.com',
      status: 'confirmed',
      service_name: 'Stemcoach',
      service_types: {
        name: 'Zangles',
        color: '#E8DAEF',
        duration: 60
      }
    },
    {
      id: 'sample-16',
      start_time: new Date(year, month, 23, 11, 0).toISOString(),
      end_time: new Date(year, month, 23, 12, 30).toISOString(),
      customer_name: 'Jin Watanabe',
      customer_phone: '+31678901234',
      customer_email: 'jin@example.com',
      status: 'confirmed',
      service_name: 'Chiropractor',
      service_types: {
        name: 'Wervelkolom Behandeling',
        color: '#AED6F1',
        duration: 90
      }
    },
    {
      id: 'sample-17',
      start_time: new Date(year, month, 24, 15, 0).toISOString(),
      end_time: new Date(year, month, 24, 16, 0).toISOString(),
      customer_name: 'Carmen Rodriguez',
      customer_email: 'carmen@example.com',
      status: 'confirmed',
      service_name: 'Dansles',
      service_types: {
        name: 'Salsa Workshop',
        color: '#F1948A',
        duration: 60
      }
    },
    {
      id: 'sample-18',
      start_time: new Date(year, month, 25, 10, 0).toISOString(),
      end_time: new Date(year, month, 25, 11, 0).toISOString(),
      customer_name: 'Erik Johansson',
      customer_phone: '+31612987654',
      customer_email: 'erik@example.com',
      status: 'pending',
      service_name: 'Persoonlijk Trainer',
      service_types: {
        name: 'Kracht Training',
        color: '#52C41A',
        duration: 60
      }
    },
    
    // End of month appointments
    {
      id: 'sample-19',
      start_time: new Date(year, month, 29, 12, 0).toISOString(),
      end_time: new Date(year, month, 29, 13, 0).toISOString(),
      customer_name: 'Yasmin El-Masri',
      customer_email: 'yasmin@example.com',
      status: 'confirmed',
      service_name: 'Henna Kunst',
      service_types: {
        name: 'Traditionele Henna',
        color: '#D4A574',
        duration: 60
      }
    },
    {
      id: 'sample-20',
      start_time: new Date(year, month, 30, 10, 30).toISOString(),
      end_time: new Date(year, month, 30, 11, 30).toISOString(),
      customer_name: 'Klaus Mueller',
      customer_phone: '+31634521789',
      customer_email: 'klaus@example.com',
      status: 'confirmed',
      service_name: 'Tarot Reading',
      service_types: {
        name: 'Spirituele Consultatie',
        color: '#D5A6BD',
        duration: 60
      }
    }
  ];

  // Filter out bookings that don't fall within the current month
  const validBookings = sampleBookings.filter(booking => {
    const bookingDate = new Date(booking.start_time);
    return bookingDate >= monthStart && bookingDate <= monthEnd;
  });

  console.log(`Generated ${validBookings.length} valid sample bookings for ${format(monthStart, 'MMMM yyyy', { locale: nl })}`);
  
  return validBookings;
};

export function ModernMonthView({ bookings, currentDate }: ModernMonthViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingDetailOpen, setBookingDetailOpen] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

  // Combine real bookings with sample bookings for demonstration
  const sampleBookings = generateSampleBookings(currentDate);
  const allBookings = [...bookings, ...sampleBookings];

  console.log('Total bookings in calendar:', allBookings.length);
  console.log('Real bookings:', bookings.length);
  console.log('Sample bookings:', sampleBookings.length);

  const getBookingsForDay = (day: Date) => {
    const dayBookings = allBookings.filter(booking => 
      isSameDay(new Date(booking.start_time), day)
    );
    
    if (dayBookings.length > 0) {
      console.log(`Found ${dayBookings.length} bookings for ${format(day, 'dd-MM-yyyy')}:`, dayBookings.map(b => b.customer_name));
    }
    
    return dayBookings;
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
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background/95 to-card/50">
      {/* Enhanced Week Headers */}
      <div className="flex-shrink-0 bg-gradient-to-r from-card/90 via-card to-card/90 backdrop-blur-xl rounded-2xl mx-4 mt-4 p-3 shadow-lg shadow-black/5 border border-border/40 sticky top-0 z-20">
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, index) => (
            <div key={day} className="text-center py-3 px-2 rounded-xl bg-gradient-to-b from-muted/50 to-muted/30 border border-border/30">
              <div className="text-sm font-bold text-foreground tracking-wide">{day}</div>
              <div className="text-xs text-muted-foreground font-medium mt-1">
                {['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'][index]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modern Calendar Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pt-2">
          <div className="grid grid-cols-7 gap-3">
            {days.map(day => {
              const dayBookings = getBookingsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isDayToday = isToday(day);
              const hasMultipleBookings = dayBookings.length > 1;

              return (
                <div
                  key={day.toISOString()}
                  className={`group rounded-3xl p-4 min-h-[140px] transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-xl ${
                    hasMultipleBookings ? 'cursor-pointer' : ''
                  } ${
                    isCurrentMonth 
                      ? isDayToday
                        ? 'bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 border-2 border-primary/50 shadow-xl shadow-primary/20'
                        : 'bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-sm border border-border/60 hover:border-primary/30 hover:shadow-lg shadow-black/5'
                      : 'bg-gradient-to-br from-muted/60 via-muted/40 to-muted/30 border border-border/30 opacity-60 hover:opacity-80'
                  }`}
                  onClick={() => handleDayClick(day, dayBookings)}
                >
                  {/* Day Header */}
                  <div className={`flex items-center justify-between mb-3 ${
                    isDayToday ? 'text-primary' : 'text-foreground'
                  }`}>
                    <div className={`text-lg font-bold ${
                      isDayToday 
                        ? 'bg-primary text-primary-foreground w-8 h-8 rounded-2xl flex items-center justify-center text-sm shadow-lg shadow-primary/30' 
                        : ''
                    }`}>
                      {format(day, 'd')}
                    </div>
                    {dayBookings.length > 0 && (
                      <div className="flex items-center gap-1 bg-blue-500/20 text-blue-600 px-2 py-1 rounded-xl font-semibold text-xs border border-blue-500/30">
                        <Calendar className="w-3 h-3" />
                        {dayBookings.length}
                      </div>
                    )}
                  </div>
                  
                  {/* Bookings Display */}
                  <div className="space-y-2">
                    {dayBookings.length === 0 && isCurrentMonth && (
                      <div className="text-center py-4 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <div className="text-xs text-muted-foreground mb-2 font-medium">Geen afspraken</div>
                        <div className="w-8 h-px bg-gradient-to-r from-transparent via-border to-transparent mx-auto"></div>
                      </div>
                    )}
                    
                    {dayBookings.length === 1 && (
                      <div
                        className="group/booking p-3 rounded-2xl cursor-pointer hover:scale-105 transition-all duration-300 shadow-md hover:shadow-lg border border-white/20"
                        style={{
                          background: `linear-gradient(135deg, ${dayBookings[0].service_types?.color || '#3B82F6'}, ${dayBookings[0].service_types?.color || '#3B82F6'}dd)`
                        }}
                        title={`${format(new Date(dayBookings[0].start_time), 'HH:mm')} - ${dayBookings[0].customer_name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBookingClick(dayBookings[0]);
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-white text-xs font-bold">
                            <Clock className="w-3 h-3" />
                            {format(new Date(dayBookings[0].start_time), 'HH:mm')}
                          </div>
                          <div className={`w-2 h-2 rounded-full ${
                            dayBookings[0].status === 'confirmed' ? 'bg-white/90' :
                            dayBookings[0].status === 'pending' ? 'bg-yellow-300/90' :
                            'bg-red-300/90'
                          }`} />
                        </div>
                        <div className="text-white/95 text-sm font-semibold truncate mb-1 flex items-center gap-2">
                          <User className="w-3 h-3" />
                          {dayBookings[0].customer_name}
                        </div>
                        <div className="text-white/80 text-xs truncate">
                          {dayBookings[0].service_types?.name || dayBookings[0].service_name || 'Afspraak'}
                        </div>
                        {dayBookings[0].customer_phone && (
                          <div className="text-white/70 text-xs truncate flex items-center gap-1 mt-2 opacity-0 group-hover/booking:opacity-100 transition-opacity">
                            <Phone className="w-3 h-3" />
                            {dayBookings[0].customer_phone}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {dayBookings.length > 1 && (
                      <div className="text-center py-4 bg-gradient-to-br from-blue-500/20 via-blue-500/15 to-blue-500/10 rounded-2xl border border-blue-500/30 hover:from-blue-500/25 hover:to-blue-500/15 hover:border-blue-500/40 transition-all duration-300 cursor-pointer group-hover:scale-105 shadow-sm hover:shadow-md">
                        <div className="text-blue-600 font-bold text-sm mb-1 flex items-center justify-center gap-2">
                          <Calendar className="w-4 h-4" />
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
