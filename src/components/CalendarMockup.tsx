
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CalendarMockup = () => {
  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
      {/* Calendar header */}
      <div className="bg-gradient-to-r from-[#075e54] to-[#128c7e] text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <ChevronLeft className="w-5 h-5 cursor-pointer hover:opacity-75" />
          <h2 className="text-lg font-semibold">December 2024</h2>
          <ChevronRight className="w-5 h-5 cursor-pointer hover:opacity-75" />
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
          {/* Previous month dates */}
          <div className="text-center py-3 text-gray-300">30</div>
          
          {/* Current month dates */}
          {Array.from({ length: 31 }, (_, i) => {
            const date = i + 1;
            const isMonday = date === 9; // Example Monday
            
            return (
              <div key={date} className="relative">
                <div className={`text-center py-3 text-sm ${isMonday ? 'bg-[#dcf8c6] rounded-lg font-medium' : 'hover:bg-gray-50 rounded-lg'}`}>
                  {date}
                </div>
                {isMonday && (
                  <div className="absolute top-8 left-0 right-0 mx-1">
                    <div className="bg-[#075e54] text-white text-xs px-2 py-1 rounded text-center">
                      <div className="font-medium">10:00 AM</div>
                      <div className="opacity-90">Haircut - Lisa</div>
                      <div className="opacity-75">(via WhatsApp)</div>
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
