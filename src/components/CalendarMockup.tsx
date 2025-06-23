
import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { generateSampleBookings } from './calendar/utils/sampleBookings';

const CalendarMockup = () => {
  const currentDate = new Date(2025, 4, 14); // May 14, 2025
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

  // Get sample bookings for this month
  const sampleBookings = generateSampleBookings(currentDate);

  const getBookingsForDay = (day: Date) => {
    return sampleBookings.filter(booking => 
      new Date(booking.start_time).toDateString() === day.toDateString()
    );
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-card/20 backdrop-blur-sm rounded-xl shadow-sm overflow-hidden border border-border/20">
      {/* Compact Header */}
      <div className="bg-card/30 backdrop-blur-sm p-2 border-b border-border/20">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">Mei 2025</h3>
          <p className="text-xs text-muted-foreground">Agenda Overzicht</p>
        </div>
      </div>

      {/* Compact Week Headers */}
      <div className="bg-card/20 p-1 border-b border-border/20">
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => (
            <div key={day} className="text-center py-1 px-1 rounded bg-muted/20">
              <div className="text-xs font-medium text-foreground">{day}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Fixed Height Calendar Grid */}
      <div className="p-2">
        <div className="grid grid-cols-7 gap-1">
          {days.map(day => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isDayToday = isToday(day);
            const dayBookings = getBookingsForDay(day);

            return (
              <div
                key={day.toISOString()}
                className={`rounded-lg p-1.5 h-[60px] flex flex-col transition-all duration-200 relative ${
                  isCurrentMonth 
                    ? isDayToday
                      ? 'bg-primary/10 border border-primary/30'
                      : 'bg-card/30 backdrop-blur-sm border border-border/20 hover:bg-card/40'
                    : 'bg-muted/20 border border-border/10 opacity-50'
                }`}
              >
                {/* Day Number */}
                <div className={`text-xs font-medium ${
                  isDayToday 
                    ? 'bg-primary text-primary-foreground w-4 h-4 rounded-md flex items-center justify-center text-[10px]' 
                    : 'text-foreground'
                }`}>
                  {format(day, 'd')}
                </div>

                {/* Booking Content - Direct under day number with NO margin */}
                <div className="flex-1 flex flex-col justify-start">
                  {dayBookings.length === 1 && (
                    <div className="w-full p-0.5 rounded bg-slate-700/50 backdrop-blur-sm border border-slate-600/30 relative">
                      {/* Indicator dot INSIDE the booking card */}
                      <div className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-slate-400"></div>
                      <div className="text-[9px] text-slate-200 font-medium truncate text-left pr-2">
                        {format(new Date(dayBookings[0].start_time), 'HH:mm')}
                      </div>
                      <div className="text-[8px] text-slate-300/80 truncate text-left pr-2">
                        {dayBookings[0].customer_name}
                      </div>
                    </div>
                  )}
                  
                  {dayBookings.length > 1 && (
                    <div className="w-full p-0.5 rounded bg-slate-700/50 backdrop-blur-sm border border-slate-600/30">
                      <div className="text-[9px] text-slate-200 font-medium text-left">
                        {dayBookings.length}
                      </div>
                      <div className="text-[8px] text-slate-300/80 text-left">
                        afspraken
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Compact Footer */}
      <div className="bg-card/20 px-2 py-1 border-t border-border/20">
        <div className="flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
              <span className="text-muted-foreground">Afspraken</span>
            </div>
          </div>
          <div className="text-muted-foreground">
            {sampleBookings.length} afspraken
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarMockup;
