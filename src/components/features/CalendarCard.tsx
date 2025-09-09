import { CalendarIcon } from "@radix-ui/react-icons";
import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Check, Calendar, Users, MessageCircle, Clock, CheckCircle, Activity } from "lucide-react";

export const CalendarCard = () => {
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const calendarRef = useRef<HTMLDivElement>(null);

  // Extended booking data for both views
  const bookings = {
    2: { 
      id: 1, 
      name: "John Peterson", 
      service: "Personal Training", 
      time: "9:00", 
      duration: "60 min",
      phone: "+31 6 1234 5678",
      email: "john@example.com",
      status: "confirmed",
      notes: "Focuses on strength training and weight loss"
    },
    4: { 
      id: 2, 
      name: "Sarah Johnson", 
      service: "Yoga Class", 
      time: "10:30", 
      duration: "90 min",
      phone: "+31 6 2345 6789",
      email: "sarah@example.com",
      status: "confirmed",
      notes: "Beginner level, prefers morning sessions"
    },
    7: { 
      id: 3, 
      name: "Mike Williams", 
      service: "Massage Therapy", 
      time: "14:00", 
      duration: "45 min",
      phone: "+31 6 3456 7890",
      email: "mike@example.com",
      status: "confirmed",
      notes: "Deep tissue massage for sports recovery"
    },
    9: { 
      id: 4, 
      name: "Emma Davis", 
      service: "Pilates Session", 
      time: "11:00", 
      duration: "60 min",
      phone: "+31 6 4567 8901",
      email: "emma@example.com",
      status: "pending",
      notes: "Rehabilitation exercises for lower back"
    },
    11: { 
      id: 5, 
      name: "Tom Brown", 
      service: "CrossFit Training", 
      time: "16:00", 
      duration: "75 min",
      phone: "+31 6 5678 9012",
      email: "tom@example.com",
      status: "confirmed",
      notes: "High intensity workout, experienced athlete"
    },
    14: { 
      id: 6, 
      name: "Lisa Garcia", 
      service: "Nutrition Consultation", 
      time: "13:30", 
      duration: "45 min",
      phone: "+31 6 6789 0123",
      email: "lisa@example.com",
      status: "confirmed",
      notes: "Weight management and meal planning"
    },
    15: { 
      id: 7, 
      name: "Dave Miller", 
      service: "Personal Training", 
      time: "8:00", 
      duration: "60 min",
      phone: "+31 6 7890 1234",
      email: "dave@example.com",
      status: "confirmed",
      notes: "Early morning session, cardio focus"
    },
    17: { 
      id: 8, 
      name: "Anna Wilson", 
      service: "Evening Yoga", 
      time: "18:00", 
      duration: "90 min",
      phone: "+31 6 8901 2345",
      email: "anna@example.com",
      status: "confirmed",
      notes: "Relaxation and stress relief session"
    },
    18: { 
      id: 9, 
      name: "Chris Martinez", 
      service: "Sports Massage", 
      time: "15:30", 
      duration: "60 min",
      phone: "+31 6 9012 3456",
      email: "chris@example.com",
      status: "confirmed",
      notes: "Pre-competition preparation massage"
    },
    21: { 
      id: 10, 
      name: "Kate Thompson", 
      service: "Pilates Mat Class", 
      time: "12:00", 
      duration: "60 min",
      phone: "+31 6 0123 4567",
      email: "kate@example.com",
      status: "confirmed",
      notes: "Core strengthening and flexibility"
    },
    22: { 
      id: 11, 
      name: "Ben Anderson", 
      service: "CrossFit WOD", 
      time: "17:00", 
      duration: "60 min",
      phone: "+31 6 1234 5670",
      email: "ben@example.com",
      status: "confirmed",
      notes: "Workout of the day, group session"
    },
    24: { 
      id: 12, 
      name: "Mia Taylor", 
      service: "Nutrition & Lifestyle", 
      time: "10:00", 
      duration: "60 min",
      phone: "+31 6 2345 6701",
      email: "mia@example.com",
      status: "pending",
      notes: "First consultation, weight loss goals"
    },
    25: { 
      id: 13, 
      name: "Sam Rodriguez", 
      service: "Strength Training", 
      time: "14:30", 
      duration: "75 min",
      phone: "+31 6 3456 7012",
      email: "sam@example.com",
      status: "confirmed",
      notes: "Powerlifting focused training session"
    },
    28: { 
      id: 14, 
      name: "Alex Moore", 
      service: "Yin Yoga", 
      time: "19:00", 
      duration: "90 min",
      phone: "+31 6 4567 0123",
      email: "alex@example.com",
      status: "confirmed",
      notes: "Restorative yoga for deep relaxation"
    },
    30: { 
      id: 15, 
      name: "Zoe White", 
      service: "Therapeutic Massage", 
      time: "11:30", 
      duration: "60 min",
      phone: "+31 6 5670 1234",
      email: "zoe@example.com",
      status: "confirmed",
      notes: "Injury recovery and pain management"
    }
  };

  const handleBookingClick = (booking: any, event: React.MouseEvent) => {
    event.stopPropagation();
    const targetRect = (event.target as HTMLElement).getBoundingClientRect();
    
    // Get calendar container bounds for relative positioning
    const calendarRect = calendarRef.current?.getBoundingClientRect();
    if (!calendarRect) return;
    
    // Calculate position relative to calendar container
    const x = targetRect.left + targetRect.width / 2 - calendarRect.left;
    const y = targetRect.top - 10 - calendarRect.top;
    
    // Check calendar boundaries and adjust position
    const calendarWidth = calendarRect.width;
    const calendarHeight = calendarRect.height;
    const popupWidth = 280;
    const popupHeight = 300;
    
    let adjustedX = x;
    let adjustedY = y;
    
    // Flip horizontally if popup would go off calendar
    if (x + popupWidth / 2 > calendarWidth - 20) {
      adjustedX = calendarWidth - popupWidth / 2 - 20;
    } else if (x - popupWidth / 2 < 20) {
      adjustedX = popupWidth / 2 + 20;
    }
    
    // Flip vertically if popup would go off calendar
    if (y - popupHeight < 20) {
      adjustedY = targetRect.bottom - calendarRect.top + 10;
    }
    
    setPopupPosition({ x: adjustedX, y: adjustedY });
    setSelectedBooking(booking);
    setShowPopup(true);
  };

  // Handle escape key and click outside
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showPopup) {
        setShowPopup(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (showPopup && !(e.target as Element).closest('[data-popup]')) {
        setShowPopup(false);
      }
    };

    if (showPopup) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPopup]);

  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      
      {/* Full Calendar Section */}
      <div ref={calendarRef} className="absolute top-2 left-2 right-2 bottom-2 bg-slate-800/95 rounded-xl border border-slate-700/50 p-3 backdrop-blur-sm flex flex-col relative">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-white text-[12px] font-semibold">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex text-[7px] bg-slate-700/60 rounded overflow-hidden">
              <button 
                onClick={() => setCalendarView('month')}
                className={`px-2 py-1 transition-colors ${
                  calendarView === 'month' 
                    ? 'bg-emerald-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Month
              </button>
              <button 
                onClick={() => setCalendarView('week')}
                className={`px-2 py-1 transition-colors ${
                  calendarView === 'week' 
                    ? 'bg-emerald-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Week
              </button>
            </div>
          </div>
        </div>
        
        {/* Calendar Grid */}
        {calendarView === 'month' ? (
          <div className="flex-1 flex flex-col">
                <div className="grid grid-cols-7 gap-1 text-[7px] mb-2">
                  {/* Day Headers */}
                  {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
                    <div key={day} className="text-slate-400 text-center py-1 font-medium border-b border-slate-700/30">{day}</div>
                  ))}
                  
                {/* Calendar Dates with optimized booking display */}
                {[
                  { date: 30, isOtherMonth: true }, { date: 1, isOtherMonth: false }, { date: 2, isOtherMonth: false, booking: bookings[2] }, { date: 3, isOtherMonth: false }, { date: 4, isOtherMonth: false, booking: bookings[4] }, { date: 5, isOtherMonth: false }, { date: 6, isOtherMonth: false },
                  { date: 7, isOtherMonth: false, booking: bookings[7] }, { date: 8, isOtherMonth: false }, { date: 9, isOtherMonth: false, booking: bookings[9] }, { date: 10, isOtherMonth: false }, { date: 11, isOtherMonth: false, booking: bookings[11] }, { date: 12, isOtherMonth: false }, { date: 13, isOtherMonth: false },
                  { date: 14, isOtherMonth: false, booking: bookings[14] }, { date: 15, isOtherMonth: false, booking: bookings[15] }, { date: 16, isOtherMonth: false }, { date: 17, isOtherMonth: false, booking: bookings[17] }, { date: 18, isOtherMonth: false, booking: bookings[18] }, { date: 19, isOtherMonth: false }, { date: 20, isOtherMonth: false },
                  { date: 21, isOtherMonth: false, booking: bookings[21] }, { date: 22, isOtherMonth: false, booking: bookings[22] }, { date: 23, isOtherMonth: false }, { date: 24, isOtherMonth: false, booking: bookings[24] }, { date: 25, isOtherMonth: false, booking: bookings[25] }, { date: 26, isOtherMonth: false }, { date: 27, isOtherMonth: false },
                  { date: 28, isOtherMonth: false, booking: bookings[28] }, { date: 29, isOtherMonth: false }, { date: 30, isOtherMonth: false, booking: bookings[30] }, { date: 31, isOtherMonth: false }, { date: 1, isOtherMonth: true }, { date: 2, isOtherMonth: true }, { date: 3, isOtherMonth: true }
                ].map((day, index) => (
                  <div key={index} className={`text-center py-1 h-14 flex flex-col items-center justify-start text-[7px] transition-colors rounded ${
                    day.booking 
                      ? 'bg-emerald-600/80 text-white font-medium border border-emerald-500/50 cursor-pointer hover:bg-emerald-600/95' 
                      : day.isOtherMonth 
                        ? 'text-slate-500 hover:bg-slate-700/30' 
                        : 'text-slate-300 hover:bg-slate-700/50'
                  }`}
                  onClick={day.booking ? (e) => handleBookingClick(day.booking, e) : undefined}>
                    <div className="font-medium">{day.date}</div>
                    {day.booking && (
                      <div className="text-[6px] mt-1 px-1 leading-tight">
                        <div className="text-emerald-200">{day.booking.name.split(' ')[0]}</div>
                        <div className="text-emerald-100">{day.booking.service}</div>
                        <div className="text-emerald-300">{day.booking.time}</div>
                      </div>
                    )}
                  </div>
                ))}
                </div>
                
                 {/* Booking Summary - Optimized */}
                <div className="bg-slate-700/50 rounded-lg p-2 mt-2">
                  <div className="text-slate-300 text-[8px] font-medium mb-1">Today's Bookings</div>
                  <div className="space-y-1">
                    {[
                      { time: "09:00", name: "John", service: "Personal Training" },
                      { time: "11:30", name: "Lisa", service: "Yoga Class" },
                      { time: "14:00", name: "Mike", service: "Massage Therapy" },
                      { time: "16:30", name: "Sofia", service: "Pilates" },
                      { time: "18:00", name: "David", service: "Strength Training" }
                    ].map((booking, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[7px]">
                        <span className="text-slate-400">{booking.time} - {booking.name} ({booking.service})</span>
                        <span className="text-emerald-400">Confirmed</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
        ) : (
          <div className="space-y-1 flex-1">
                {/* Week Headers */}
                <div className="grid grid-cols-8 gap-1 text-[7px]">
                  <div className="text-slate-400 text-center py-1 font-medium">Time</div>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                    // Get the date for this day in the current month
                    const weekStartDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 7); // Start from 7th
                    const dayDate = weekStartDate.getDate() + index;
                    return (
                      <div key={day} className="text-slate-400 text-center py-1 font-medium border-b border-slate-700/30">
                        {day} {dayDate}
                      </div>
                    );
                  })}
                </div>
                
                {/* Time Slots */}
                <div className="space-y-1">
                  {Array.from({ length: 18 }, (_, i) => {
                    const hour = 6 + i;
                    return hour.toString().padStart(2, '0') + ':00';
                  }).map((time) => (
                    <div key={time} className="grid grid-cols-8 gap-1 text-[7px]">
                      <div className="text-slate-400 text-center py-1 font-medium">{time}</div>
                      {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                        // Calculate the actual date for this day
                        const weekStartDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 7);
                        const dayDate = weekStartDate.getDate() + dayIndex;
                        
                        // Get booking for this date and time
                        const dayBooking = bookings[dayDate as keyof typeof bookings];
                        const booking = dayBooking && dayBooking.time === time ? dayBooking : null;
                        
                        return (
                          <div key={dayIndex} className={`py-1 px-1 rounded text-center transition-colors ${
                            booking 
                              ? 'bg-emerald-600/80 text-white font-medium border border-emerald-500/50 cursor-pointer hover:bg-emerald-600/95 hover:scale-110 hover:shadow-lg hover:shadow-emerald-500/30 transition-all duration-300 ease-out transform' 
                              : 'hover:bg-slate-700/30'
                          }`}
                          onClick={booking ? (e) => handleBookingClick(booking, e) : undefined}>
                            {booking && (
                              <div className="text-[6px] leading-tight">
                                <div className="text-emerald-200">{booking.name.split(' ')[0]}</div>
                                <div className="text-emerald-100">{booking.service}</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
        )}

        {/* Booking Popup */}
        {showPopup && selectedBooking && (
          <div 
            data-popup="true"
            className="absolute z-[9999] bg-slate-900/95 border border-slate-600/50 rounded-lg p-3 backdrop-blur-sm shadow-2xl"
            style={{
              left: `${popupPosition.x}px`,
              top: `${popupPosition.y}px`,
              transform: 'translateX(-50%) translateY(-100%)',
              minWidth: '240px',
              maxWidth: '280px'
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-1 right-1 text-slate-400 hover:text-white transition-colors"
            >
              <X size={12} />
            </button>
            
            {/* Booking details */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      selectedBooking.status === 'confirmed' ? 'bg-emerald-400' : 'bg-yellow-400'
                    }`} />
                    <span className="text-white text-[10px] font-semibold">
                      {selectedBooking.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                    </span>
                  </div>
                  
                  <div>
                    <h4 className="text-white text-[11px] font-semibold">{selectedBooking.name}</h4>
                    <p className="text-emerald-400 text-[9px] font-medium">{selectedBooking.service}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[8px]">
                      <span className="text-slate-400">Time:</span>
                      <span className="text-white">{selectedBooking.time} ({selectedBooking.duration})</span>
                    </div>
                    <div className="flex items-center gap-2 text-[8px]">
                      <span className="text-slate-400">Phone:</span>
                      <span className="text-white">{selectedBooking.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[8px]">
                      <span className="text-slate-400">Email:</span>
                      <span className="text-white">{selectedBooking.email}</span>
                    </div>
                  </div>
                  
                  {selectedBooking.notes && (
                    <div className="border-t border-slate-700/50 pt-2">
                      <p className="text-slate-300 text-[8px] leading-relaxed">{selectedBooking.notes}</p>
                    </div>
                  )}
                </div>
          </div>
        )}
      </div>
      
      {/* Subtle decorative elements */}
      <div className="absolute top-3 right-3 w-2 h-2 bg-emerald-500/20 rounded-full" />
      <div className="absolute bottom-3 left-3 w-1.5 h-1.5 bg-slate-600/20 rounded-full" />
    </div>
  );
};
