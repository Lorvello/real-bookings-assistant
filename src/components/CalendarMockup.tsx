
import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { Calendar, Clock, User } from 'lucide-react';
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
    <div className="w-full max-w-5xl mx-auto h-full flex flex-col bg-gradient-to-br from-background via-background/95 to-card/50 rounded-2xl shadow-2xl overflow-hidden border border-border/40">
      {/* Calendar Header */}
      <div className="bg-gradient-to-r from-card/90 via-card to-card/90 backdrop-blur-xl rounded-t-2xl p-4 shadow-lg shadow-black/5 border-b border-border/40">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground tracking-wide">Mei 2025</h2>
          <p className="text-muted-foreground text-sm font-medium mt-1">Agenda Overzicht</p>
        </div>
      </div>

      {/* Week Headers */}
      <div className="flex-shrink-0 bg-gradient-to-r from-card/90 via-card to-card/90 backdrop-blur-xl mx-4 mt-3 p-2 shadow-lg shadow-black/5 border border-border/40 rounded-xl">
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, index) => (
            <div key={day} className="text-center py-2 px-1 rounded-lg bg-gradient-to-b from-muted/50 to-muted/30 border border-border/30">
              <div className="text-xs font-bold text-foreground tracking-wide">{day}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="flex-1 p-4 pt-3">
        <div className="grid grid-cols-7 gap-2">
          {days.map(day => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isDayToday = isToday(day);
            const dayBookings = getBookingsForDay(day);
            const hasBookings = dayBookings.length > 0;

            return (
              <div
                key={day.toISOString()}
                className={`group rounded-2xl p-3 min-h-[90px] transition-all duration-300 ${
                  isCurrentMonth 
                    ? isDayToday
                      ? 'bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 border-2 border-primary/50 shadow-lg shadow-primary/20'
                      : 'bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-sm border border-border/60 hover:border-primary/30 hover:shadow-lg shadow-black/5'
                    : 'bg-gradient-to-br from-muted/60 via-muted/40 to-muted/30 border border-border/30 opacity-60'
                }`}
              >
                {/* Day Header */}
                <div className={`flex items-center justify-between mb-2 ${
                  isDayToday ? 'text-primary' : 'text-foreground'
                }`}>
                  <div className={`text-sm font-bold ${
                    isDayToday 
                      ? 'bg-primary text-primary-foreground w-6 h-6 rounded-xl flex items-center justify-center text-xs shadow-md shadow-primary/30' 
                      : ''
                  }`}>
                    {format(day, 'd')}
                  </div>
                  {dayBookings.length > 0 && (
                    <div className="flex items-center gap-1 bg-blue-500/20 text-blue-600 px-1.5 py-0.5 rounded-lg font-semibold text-xs border border-blue-500/30">
                      <Calendar className="w-2 h-2" />
                      {dayBookings.length}
                    </div>
                  )}
                </div>
                
                {/* Bookings Display */}
                <div className="space-y-1.5">
                  {dayBookings.length === 0 && isCurrentMonth && (
                    <div className="text-center py-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="text-xs text-muted-foreground font-medium">Geen afspraken</div>
                    </div>
                  )}
                  
                  {dayBookings.length === 1 && (
                    <div
                      className="p-2 rounded-xl cursor-pointer hover:scale-105 transition-all duration-300 shadow-sm hover:shadow-md border border-white/20"
                      style={{
                        background: `linear-gradient(135deg, ${dayBookings[0].service_types?.color || '#3B82F6'}, ${dayBookings[0].service_types?.color || '#3B82F6'}dd)`
                      }}
                      title={`${format(new Date(dayBookings[0].start_time), 'HH:mm')} - ${dayBookings[0].customer_name}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1 text-white text-xs font-bold">
                          <Clock className="w-2 h-2" />
                          {format(new Date(dayBookings[0].start_time), 'HH:mm')}
                        </div>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          dayBookings[0].status === 'confirmed' ? 'bg-white/90' :
                          dayBookings[0].status === 'pending' ? 'bg-yellow-300/90' :
                          'bg-red-300/90'
                        }`} />
                      </div>
                      <div className="text-white/95 text-xs font-semibold truncate mb-1 flex items-center gap-1">
                        <User className="w-2 h-2" />
                        {dayBookings[0].customer_name}
                      </div>
                      <div className="text-white/80 text-xs truncate">
                        {dayBookings[0].service_types?.name || dayBookings[0].service_name || 'Afspraak'}
                      </div>
                    </div>
                  )}
                  
                  {dayBookings.length > 1 && (
                    <div className="text-center py-2 bg-gradient-to-br from-blue-500/20 via-blue-500/15 to-blue-500/10 rounded-xl border border-blue-500/30 hover:from-blue-500/25 hover:to-blue-500/15 hover:border-blue-500/40 transition-all duration-300 cursor-pointer group-hover:scale-105 shadow-sm hover:shadow-md">
                      <div className="text-blue-600 font-bold text-xs mb-1 flex items-center justify-center gap-1">
                        <Calendar className="w-3 h-3" />
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

      {/* Footer with Stats */}
      <div className="bg-gradient-to-r from-card/90 to-card/95 px-4 py-3 border-t border-border/40 rounded-b-2xl">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span className="text-muted-foreground font-medium">Bevestigd</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
              <span className="text-muted-foreground font-medium">In behandeling</span>
            </div>
          </div>
          <div className="text-muted-foreground font-medium">
            {sampleBookings.length} afspraken deze maand
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarMockup;
