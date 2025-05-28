
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CalendarMockup = () => {
  // May 2025 calendar data - May 1st starts on Thursday
  const generateMayCalendar = () => {
    const calendar = [];
    
    // Previous month dates (April 27-30, 2025)
    for (let i = 27; i <= 30; i++) {
      calendar.push({ date: i, isPrevMonth: true });
    }
    
    // Current month dates (May 1-31, 2025)
    for (let i = 1; i <= 31; i++) {
      calendar.push({ date: i, isPrevMonth: false });
    }
    
    // Next month dates to fill the grid (June 1-7, 2025)
    for (let i = 1; i <= 7; i++) {
      calendar.push({ date: i, isNextMonth: true });
    }
    
    return calendar;
  };

  const calendarDates = generateMayCalendar();

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
      {/* Calendar header */}
      <div className="bg-gradient-to-r from-[#075e54] to-[#128c7e] text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <ChevronLeft className="w-5 h-5 cursor-pointer hover:opacity-75 transition-opacity" />
          <h2 className="text-lg font-semibold">May 2025</h2>
          <ChevronRight className="w-5 h-5 cursor-pointer hover:opacity-75 transition-opacity" />
        </div>
      </div>
      
      {/* Calendar grid */}
      <div className="p-6">
        {/* Days of week */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar dates */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDates.map((dateObj, index) => {
            const { date, isPrevMonth, isNextMonth } = dateObj;
            const isHighlightedDate = date === 15 && !isPrevMonth && !isNextMonth; // May 15th
            const isToday = date === 28 && !isPrevMonth && !isNextMonth; // May 28th (current date)
            
            return (
              <div key={`${date}-${index}`} className="relative">
                <div 
                  className={`
                    text-center py-3 text-sm rounded-lg transition-all duration-200 ease-in-out cursor-pointer
                    ${isPrevMonth || isNextMonth 
                      ? 'text-gray-300' 
                      : isToday 
                        ? 'bg-[#075e54]/10 text-[#075e54] font-semibold ring-2 ring-[#075e54]/20' 
                        : isHighlightedDate 
                          ? 'bg-[#dcf8c6] font-medium' 
                          : 'text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  {date}
                </div>
                
                {/* Event on May 15th */}
                {isHighlightedDate && (
                  <div className="absolute top-12 left-0 right-0 mx-1 z-10">
                    <div className="bg-[#075e54] text-white text-xs px-2 py-2 rounded-md shadow-sm">
                      <div className="font-medium leading-tight">10:00 AM</div>
                      <div className="opacity-90 leading-tight">Haircut - Lisa</div>
                      <div className="opacity-75 text-xs leading-tight">(via WhatsApp)</div>
                    </div>
                  </div>
                )}
                
                {/* Today indicator */}
                {isToday && (
                  <div className="absolute top-12 left-0 right-0 mx-1 z-10">
                    <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-md shadow-sm text-center">
                      <div className="font-medium leading-tight">Today</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CalendarMockup;
