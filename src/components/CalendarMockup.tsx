
import React from 'react';
import { ChevronLeft, ChevronRight, Clock, User } from 'lucide-react';

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

  // Realistic Dutch appointments with different service types
  const appointments = {
    2: [
      { time: '09:00', name: 'Emma van Berg', service: 'Knippen & Stylen', color: 'from-pink-500 to-rose-500', status: 'confirmed' }
    ],
    3: [
      { time: '14:30', name: 'Lars Jansen', service: 'Massage', color: 'from-blue-500 to-indigo-500', status: 'confirmed' },
      { time: '16:00', name: 'Priya Sharma', service: 'Yoga Sessie', color: 'from-purple-500 to-violet-500', status: 'pending' }
    ],
    5: [
      { time: '10:15', name: 'Ahmed Hassan', service: 'Tandarts Controle', color: 'from-green-500 to-emerald-500', status: 'confirmed' }
    ],
    7: [
      { time: '11:30', name: 'Sophie Bakker', service: 'Nagelstudio', color: 'from-pink-400 to-rose-400', status: 'confirmed' },
      { time: '15:00', name: 'David Rodriguez', service: 'Personal Training', color: 'from-orange-500 to-red-500', status: 'confirmed' }
    ],
    8: [
      { time: '09:30', name: 'Maria Santos', service: 'Schoonheidsbehandeling', color: 'from-amber-400 to-yellow-500', status: 'confirmed' }
    ],
    10: [
      { time: '13:00', name: 'Robert Chen', service: 'Fysiotherapie', color: 'from-teal-500 to-cyan-500', status: 'confirmed' },
      { time: '17:30', name: 'Isabella Ferrari', service: 'Stemcoach', color: 'from-violet-500 to-purple-500', status: 'via WhatsApp' }
    ],
    12: [
      { time: '08:45', name: 'Jin Watanabe', service: 'Acupunctuur', color: 'from-slate-500 to-gray-600', status: 'confirmed' }
    ],
    14: [
      { time: '10:00', name: 'Carmen Rodriguez', service: 'Dansles', color: 'from-red-500 to-pink-500', status: 'confirmed' },
      { time: '14:30', name: 'Erik Johansson', service: 'Chiropractor', color: 'from-blue-600 to-indigo-600', status: 'pending' }
    ],
    15: [
      { time: '16:15', name: 'Yasmin El-Masri', service: 'Henna Kunst', color: 'from-amber-600 to-orange-600', status: 'confirmed' }
    ],
    17: [
      { time: '09:15', name: 'Klaus Mueller', service: 'Coaching Gesprek', color: 'from-emerald-500 to-green-600', status: 'confirmed' },
      { time: '11:45', name: 'Fatima Al-Zahra', service: 'Diëtist Consult', color: 'from-lime-500 to-green-500', status: 'confirmed' },
      { time: '15:30', name: 'Thomas van Dijk', service: 'Massage Therapie', color: 'from-indigo-500 to-blue-600', status: 'via WhatsApp' }
    ],
    19: [
      { time: '12:00', name: 'Anna Kowalski', service: 'Pedicure', color: 'from-rose-400 to-pink-500', status: 'confirmed' }
    ],
    20: [
      { time: '10:00', name: 'Lisa de Wit', service: 'Kapperszaak', color: 'from-emerald-500 to-teal-500', status: 'confirmed' },
      { time: '14:00', name: 'Mark Johnson', service: 'Barbier', color: 'from-gray-600 to-slate-700', status: 'confirmed' }
    ],
    22: [
      { time: '16:30', name: 'Joris Petersen', service: 'Psycholoog', color: 'from-purple-600 to-violet-600', status: 'pending' }
    ],
    24: [
      { time: '09:00', name: 'Noor van der Berg', service: 'Yoga Workshop', color: 'from-violet-400 to-purple-500', status: 'confirmed' },
      { time: '13:30', name: 'Hassan Al-Rashid', service: 'Osteopaat', color: 'from-cyan-500 to-blue-500', status: 'confirmed' }
    ],
    26: [
      { time: '11:15', name: 'Emma Johansson', service: 'Wellness Massage', color: 'from-teal-400 to-cyan-500', status: 'via WhatsApp' }
    ],
    28: [
      { time: '10:30', name: 'Miguel Santos', service: 'Fitness Training', color: 'from-orange-600 to-red-600', status: 'confirmed' },
      { time: '15:45', name: 'Aisha Patel', service: 'Meditatie Sessie', color: 'from-indigo-400 to-purple-500', status: 'confirmed' }
    ],
    30: [
      { time: '14:15', name: 'Oliver Schmidt', service: 'Reflexologie', color: 'from-green-600 to-emerald-600', status: 'pending' }
    ]
  };

  const calendarDates = generateMayCalendar();

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-400/90';
      case 'pending': return 'bg-yellow-400/90';
      case 'via WhatsApp': return 'bg-emerald-400/90';
      default: return 'bg-blue-400/90';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-gradient-to-br from-white via-slate-50 to-gray-100 rounded-3xl shadow-2xl overflow-hidden border border-slate-200/60">
      {/* Modern Calendar Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white px-8 py-6">
        <div className="flex items-center justify-between">
          <ChevronLeft className="w-6 h-6 cursor-pointer hover:opacity-75 transition-all duration-200 hover:scale-110" />
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-wide">Mei 2025</h2>
            <p className="text-emerald-100 text-sm font-medium mt-1">Agenda via WhatsApp AI</p>
          </div>
          <ChevronRight className="w-6 h-6 cursor-pointer hover:opacity-75 transition-all duration-200 hover:scale-110" />
        </div>
      </div>
      
      {/* Modern Calendar Grid */}
      <div className="p-8">
        {/* Days of week with modern styling */}
        <div className="grid grid-cols-7 gap-3 mb-6">
          {['Zon', 'Maa', 'Din', 'Woe', 'Don', 'Vri', 'Zat'].map((day) => (
            <div key={day} className="text-center py-3 px-2 rounded-2xl bg-gradient-to-b from-slate-100 to-slate-200/50 border border-slate-200/60">
              <div className="text-sm font-bold text-slate-700 tracking-wide">{day}</div>
            </div>
          ))}
        </div>
        
        {/* Modern Calendar Dates */}
        <div className="grid grid-cols-7 gap-3">
          {calendarDates.map((dateObj, index) => {
            const { date, isPrevMonth, isNextMonth } = dateObj;
            const isToday = date === 14 && !isPrevMonth && !isNextMonth; // May 14th (current date)
            const dayAppointments = appointments[date] || [];
            const hasAppointments = dayAppointments.length > 0 && !isPrevMonth && !isNextMonth;
            
            return (
              <div key={`${date}-${index}`} className="relative min-h-[120px]">
                <div 
                  className={`
                    rounded-3xl p-4 h-full transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-lg group
                    ${isPrevMonth || isNextMonth 
                      ? 'bg-slate-50/50 text-slate-300 border border-slate-100' 
                      : isToday 
                        ? 'bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100 text-emerald-800 font-semibold border-2 border-emerald-300/50 shadow-lg shadow-emerald-200/50' 
                        : hasAppointments
                          ? 'bg-gradient-to-br from-white to-slate-50/80 border border-slate-200/60 hover:border-emerald-300/40 shadow-sm'
                          : 'bg-gradient-to-br from-white to-slate-50/40 border border-slate-100/60 hover:border-slate-200'
                    }
                  `}
                >
                  {/* Day number */}
                  <div className={`text-lg font-bold mb-2 ${
                    isToday 
                      ? 'bg-emerald-600 text-white w-8 h-8 rounded-2xl flex items-center justify-center text-sm shadow-md' 
                      : hasAppointments ? 'text-slate-700' : 'text-slate-500'
                  }`}>
                    {date}
                  </div>
                  
                  {/* Appointments */}
                  <div className="space-y-2">
                    {dayAppointments.slice(0, 2).map((appointment, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl cursor-pointer hover:scale-105 transition-all duration-300 shadow-md hover:shadow-lg border border-white/30 bg-gradient-to-r ${appointment.color}`}
                        title={`${appointment.time} - ${appointment.name} (${appointment.service})`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 text-white text-xs font-bold">
                            <Clock className="w-3 h-3" />
                            {appointment.time}
                          </div>
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(appointment.status)}`} />
                        </div>
                        <div className="text-white/95 text-sm font-semibold truncate mb-1 flex items-center gap-2">
                          <User className="w-3 h-3" />
                          {appointment.name}
                        </div>
                        <div className="text-white/80 text-xs truncate">
                          {appointment.service}
                        </div>
                        {appointment.status === 'via WhatsApp' && (
                          <div className="text-white/90 text-xs font-medium mt-1 bg-white/20 rounded-lg px-2 py-1">
                            📱 via WhatsApp
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {dayAppointments.length > 2 && (
                      <div className="text-center py-2 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-xl border border-blue-500/30 hover:from-blue-500/25 hover:to-indigo-500/25 transition-all duration-300">
                        <div className="text-blue-700 font-bold text-xs">
                          +{dayAppointments.length - 2} meer
                        </div>
                      </div>
                    )}
                    
                    {dayAppointments.length === 0 && !isPrevMonth && !isNextMonth && (
                      <div className="text-center py-4 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <div className="text-xs text-slate-400 font-medium">Beschikbaar</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modern Footer with Stats */}
      <div className="bg-gradient-to-r from-slate-50 to-gray-100 px-8 py-6 border-t border-slate-200/60">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
              <span className="text-slate-600 font-medium">Bevestigd</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <span className="text-slate-600 font-medium">In behandeling</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
              <span className="text-slate-600 font-medium">via WhatsApp</span>
            </div>
          </div>
          <div className="text-slate-500 font-medium">
            {Object.values(appointments).flat().length} afspraken deze maand
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarMockup;
