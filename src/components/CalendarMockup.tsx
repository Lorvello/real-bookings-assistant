
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { generateEnglishSampleBookings } from './calendar/utils/englishSampleBookings';
import { DayBookingsModal } from './calendar/DayBookingsModal';


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

const CalendarMockup = () => {
  const currentDate = new Date(2025, 6, 14); // July 14, 2025
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPosition, setModalPosition] = useState<{ x: number; y: number } | undefined>(undefined);
  const calendarRef = useRef<HTMLDivElement>(null);
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Get sample bookings for this month
  const sampleBookings = generateEnglishSampleBookings(currentDate);

  const getBookingsForDay = (day: Date) => {
    return sampleBookings.filter(booking => 
      new Date(booking.start_time).toDateString() === day.toDateString()
    );
  };

  const handleDayClick = (day: Date, dayBookings: Booking[], event: React.MouseEvent) => {
    if (dayBookings.length >= 1) {
      // Use requestAnimationFrame to defer getBoundingClientRect calls
      requestAnimationFrame(() => {
        const targetRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const calendarRect = calendarRef.current?.getBoundingClientRect();
        
        if (!calendarRect) return;
        
        // Calculate position relative to calendar container for absolute positioning
        const x = targetRect.left - calendarRect.left + targetRect.width / 2;
        const y = targetRect.top - calendarRect.top - 10;
        
        // Check calendar boundaries and adjust position
        const calendarWidth = calendarRect.width;
        const popupWidth = 320; // max-width of modal
        const popupHeight = 300; // estimated height
        
        let adjustedX = x;
        let adjustedY = y;
        
        // Check if popup would go off screen on the right
        if (x + popupWidth / 2 > calendarWidth - 20) {
          adjustedX = calendarWidth - popupWidth / 2 - 20;
        }
        
        // Check if popup would go off screen on the left
        if (x - popupWidth / 2 < 20) {
          adjustedX = popupWidth / 2 + 20;
        }
        
        // Account for translateY(-100%) transform - popup appears above y
        // Check if popup would go off screen on the top
        if (y - popupHeight < 20) {
          adjustedY = targetRect.bottom - calendarRect.top + 10;
        }
        
        setModalPosition({ x: adjustedX, y: adjustedY });
        setSelectedDate(day);
        setModalOpen(true);
      });
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedDate(null);
  };

  // Handle escape key and click outside
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalOpen) {
        closeModal();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalOpen && !(e.target as Element).closest('[data-popup]')) {
        closeModal();
      }
    };

    if (modalOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [modalOpen]);

  return (
    <div ref={calendarRef} className="w-full max-w-sm md:max-w-3xl mx-auto bg-card/20 backdrop-blur-sm rounded-lg md:rounded-xl shadow-sm border border-border/20 relative overflow-visible">
      {/* Much more compact header for mobile */}
      <div className="bg-card/30 backdrop-blur-sm p-1.5 md:p-2 border-b border-border/20">
        <div className="text-center">
          <h3 className="text-sm md:text-lg font-semibold text-foreground">July 2025</h3>
          <p className="text-[10px] md:text-xs text-muted-foreground">Calendar Overview</p>
        </div>
      </div>

      {/* Much more compact week headers for mobile */}
      <div className="bg-card/20 p-0.5 md:p-1 border-b border-border/20">
        <div className="grid grid-cols-7 gap-0.5 md:gap-1">
          {weekDays.map((day) => (
            <div key={day} className="text-center py-0.5 md:py-1 px-0.5 md:px-1 rounded bg-muted/20">
              <div className="text-[9px] md:text-xs font-medium text-foreground">{day}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Optimized mobile calendar grid */}
      <div className="p-1 md:p-2">
        <div className="grid grid-cols-7 gap-0.5 md:gap-1">
          {useMemo(() => days.map(day => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isDayToday = isToday(day);
            const dayBookings = getBookingsForDay(day);

            return (
              <div
                key={day.toISOString()}
                className={`rounded-md md:rounded-lg p-1 md:p-1.5 min-h-[45px] md:min-h-[70px] sm:h-[60px] flex flex-col transition-all duration-200 relative cursor-pointer ${
                  isCurrentMonth 
                    ? isDayToday
                      ? 'bg-primary/10 border border-primary/30'
                      : 'bg-card/30 backdrop-blur-sm border border-border/20 hover:bg-card/40'
                    : 'bg-muted/20 border border-border/10 opacity-50'
                } ${dayBookings.length > 1 ? 'hover:shadow-md' : ''}`}
                onClick={(e) => handleDayClick(day, dayBookings, e)}
              >
                {/* Day Number - Much more compact for mobile */}
                <div className={`text-[9px] md:text-xs sm:text-xs font-medium mb-0.5 md:mb-1 ${
                  isDayToday 
                    ? 'bg-primary text-primary-foreground w-3 h-3 md:w-5 md:h-5 sm:w-4 sm:h-4 rounded-sm md:rounded-md flex items-center justify-center text-[8px] md:text-[10px] sm:text-[10px]' 
                    : 'text-foreground'
                }`}>
                  {format(day, 'd')}
                </div>

                {/* Booking Content - Much more compact for mobile */}
                <div className="flex-1 flex flex-col justify-start space-y-0.5">
                   {dayBookings.length === 1 && (
                    <div 
                      className="w-full px-1 md:px-1.5 py-0.5 md:py-1 rounded-sm md:rounded-md bg-emerald-600/80 backdrop-blur-sm border border-emerald-500/30 relative cursor-pointer hover:bg-emerald-700/80 transition-colors"
                    >
                      {/* Much more compact text for mobile */}
                      <div className="text-[7px] md:text-[9px] sm:text-[8px] text-white font-medium truncate text-left">
                        {format(new Date(dayBookings[0].start_time), 'HH:mm')}
                      </div>
                      <div className="text-[6px] md:text-[8px] sm:text-[7px] text-white/90 truncate text-left leading-tight">
                        {dayBookings[0].customer_name}
                      </div>
                    </div>
                  )}
                  
                  {dayBookings.length > 1 && (
                    <div className="w-full px-1 md:px-1.5 py-0.5 md:py-1 rounded-sm md:rounded-md bg-blue-600/80 backdrop-blur-sm border border-blue-500/30 hover:bg-blue-700/80 transition-colors">
                      <div className="text-[7px] md:text-[9px] sm:text-[8px] text-white font-medium text-left">
                        {dayBookings.length}
                      </div>
                      <div className="text-[6px] md:text-[8px] sm:text-[7px] text-white/90 text-left leading-tight truncate">
                        appointments
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          }), [days, currentDate])}
        </div>
      </div>

      {/* Much more compact footer for mobile */}
      <div className="bg-card/20 px-1.5 md:px-2 py-0.5 md:py-1 border-t border-border/20">
        <div className="flex items-center justify-between text-[8px] md:text-[10px]">
          <div className="flex items-center gap-1 md:gap-2">
            <div className="flex items-center gap-0.5 md:gap-1">
              <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-emerald-500"></div>
              <span className="text-muted-foreground">Appointments</span>
            </div>
          </div>
          <div className="text-muted-foreground">
            {sampleBookings.length} appointments
          </div>
        </div>
      </div>

      <DayBookingsModal
        open={modalOpen}
        onClose={closeModal}
        date={selectedDate}
        bookings={selectedDate ? getBookingsForDay(selectedDate) : []}
        position={modalPosition}
      />
    </div>
  );
};

export default CalendarMockup;
