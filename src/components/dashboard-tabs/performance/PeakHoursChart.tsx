
import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { Activity, Clock, Users } from 'lucide-react';

interface PeakHoursData {
  hour: number;
  bookings: number;
  hour_label: string;
}

interface PeakHoursChartProps {
  data?: PeakHoursData[];
  isLoading?: boolean;
}

export function PeakHoursChart({ data, isLoading }: PeakHoursChartProps) {
  if (isLoading) {
    return (
      <div className="h-80 bg-gradient-to-br from-slate-700/30 to-slate-800/40 rounded-xl animate-pulse border border-slate-600/20"></div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-2xl flex items-center justify-center border border-slate-600/30">
          <Activity className="h-10 w-10 text-slate-400" />
        </div>
        <p className="text-slate-300 font-medium mb-2">Geen piekuren data beschikbaar</p>
        <p className="text-sm text-slate-400">Meer historische data nodig voor analyse</p>
      </div>
    );
  }

  // Maak een complete dataset voor alle werkuren (6:00 - 22:00)
  const completeHourData = [];
  for (let hour = 6; hour <= 22; hour++) {
    const existingData = data.find(d => d.hour === hour);
    completeHourData.push({
      hour,
      bookings: existingData?.bookings || 0,
      hour_label: `${hour.toString().padStart(2, '0')}:00`,
      display_label: `${hour}:00`
    });
  }

  // Bepaal max waarde voor kleur intensiteit
  const maxBookings = Math.max(...completeHourData.map(d => d.bookings));
  
  // Functie om kleur te bepalen op basis van drukte
  const getBarColor = (bookings: number) => {
    if (bookings === 0) return '#64748B'; // Grijs voor geen boekingen
    
    const intensity = bookings / maxBookings;
    if (intensity >= 0.8) return '#EF4444'; // Rood voor zeer druk
    if (intensity >= 0.6) return '#F97316'; // Oranje voor druk  
    if (intensity >= 0.4) return '#EAB308'; // Geel voor gemiddeld
    if (intensity >= 0.2) return '#22C55E'; // Groen voor rustig
    return '#10B981'; // Lichtgroen voor heel rustig
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const bookings = data.bookings;
      
      let drukteIndicatie = '';
      if (bookings === 0) drukteIndicatie = 'Geen boekingen';
      else if (bookings / maxBookings >= 0.8) drukteIndicatie = 'Zeer druk 🔥';
      else if (bookings / maxBookings >= 0.6) drukteIndicatie = 'Druk 📈';
      else if (bookings / maxBookings >= 0.4) drukteIndicatie = 'Gemiddeld 📊';
      else if (bookings / maxBookings >= 0.2) drukteIndicatie = 'Rustig 😌';
      else drukteIndicatie = 'Heel rustig 💤';

      return (
        <div className="bg-slate-900/95 border border-green-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-green-400" />
            <span className="text-slate-100 font-semibold">{label}</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-blue-400" />
            <span className="text-slate-200">{bookings} afspraken</span>
          </div>
          <div className="text-sm text-slate-300 mt-2 px-2 py-1 bg-slate-800/50 rounded">
            {drukteIndicatie}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Legenda bovenaan */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#64748B' }}></div>
          <span className="text-slate-300">Geen boekingen</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10B981' }}></div>
          <span className="text-slate-300">Heel rustig</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22C55E' }}></div>
          <span className="text-slate-300">Rustig</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#EAB308' }}></div>
          <span className="text-slate-300">Gemiddeld</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F97316' }}></div>
          <span className="text-slate-300">Druk</span>
        </div>
      </div>

      {/* Grafiek */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={completeHourData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis 
              dataKey="display_label" 
              stroke="#94A3B8"
              fontSize={11}
              tick={{ fill: '#94A3B8' }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              stroke="#94A3B8" 
              fontSize={12}
              tick={{ fill: '#94A3B8' }}
              label={{ value: 'Aantal afspraken', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#94A3B8' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="bookings" radius={[4, 4, 0, 0]}>
              {completeHourData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.bookings)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Snelle inzichten onderaan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {(() => {
          const sortedHours = [...completeHourData].sort((a, b) => b.bookings - a.bookings);
          const busiestHour = sortedHours[0];
          const quietestHours = completeHourData.filter(h => h.bookings === 0);
          const averageBookings = completeHourData.reduce((sum, h) => sum + h.bookings, 0) / completeHourData.length;

          return (
            <>
              <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-medium text-slate-200">Drukste moment</span>
                </div>
                <p className="text-lg font-bold text-slate-100">{busiestHour.display_label}</p>
                <p className="text-sm text-slate-300">{busiestHour.bookings} afspraken</p>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-slate-200">Rustige momenten</span>
                </div>
                <p className="text-lg font-bold text-slate-100">{quietestHours.length} uren</p>
                <p className="text-sm text-slate-300">Zonder afspraken</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-slate-200">Gemiddeld per uur</span>
                </div>
                <p className="text-lg font-bold text-slate-100">{averageBookings.toFixed(1)}</p>
                <p className="text-sm text-slate-300">afspraken</p>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
