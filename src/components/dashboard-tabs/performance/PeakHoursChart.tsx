
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
        <p className="text-slate-300 font-medium mb-2">No peak hours data available</p>
        <p className="text-sm text-slate-400">More historical data needed for analysis</p>
      </div>
    );
  }

  // Create a complete dataset for all working hours (6:00 - 22:00)
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

  // Determine max value for color intensity
  const maxBookings = Math.max(...completeHourData.map(d => d.bookings));
  
  // Function to determine color based on activity
  const getBarColor = (bookings: number) => {
    if (bookings === 0) return '#64748B'; // Gray for no bookings
    
    const intensity = bookings / maxBookings;
    if (intensity >= 0.8) return '#EF4444'; // Red for very busy
    if (intensity >= 0.6) return '#F97316'; // Orange for busy  
    if (intensity >= 0.4) return '#EAB308'; // Yellow for moderate
    if (intensity >= 0.2) return '#22C55E'; // Green for quiet
    return '#10B981'; // Light green for very quiet
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const bookings = data.bookings;
      
      let activityLevel = '';
      if (bookings === 0) activityLevel = 'No bookings';
      else if (bookings / maxBookings >= 0.8) activityLevel = 'Very busy 🔥';
      else if (bookings / maxBookings >= 0.6) activityLevel = 'Busy 📈';
      else if (bookings / maxBookings >= 0.4) activityLevel = 'Moderate 📊';
      else if (bookings / maxBookings >= 0.2) activityLevel = 'Quiet 😌';
      else activityLevel = 'Very quiet 💤';

      return (
        <div className="bg-slate-900/95 border border-green-500/30 rounded-xl p-4 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-green-400" />
            <span className="text-slate-100 font-semibold">{label}</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-blue-400" />
            <span className="text-slate-200">{bookings} appointments</span>
          </div>
          <div className="text-sm text-slate-300 mt-2 px-2 py-1 bg-slate-800/50 rounded">
            {activityLevel}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Legend at the top */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#64748B' }}></div>
          <span className="text-slate-300">No bookings</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10B981' }}></div>
          <span className="text-slate-300">Very quiet</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22C55E' }}></div>
          <span className="text-slate-300">Quiet</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#EAB308' }}></div>
          <span className="text-slate-300">Moderate</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F97316' }}></div>
          <span className="text-slate-300">Busy</span>
        </div>
      </div>

      {/* Chart */}
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
              label={{ value: 'Number of appointments', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#94A3B8' } }}
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

      {/* Quick insights at the bottom */}
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
                  <span className="text-sm font-medium text-slate-200">Busiest time</span>
                </div>
                <p className="text-lg font-bold text-slate-100">{busiestHour.display_label}</p>
                <p className="text-sm text-slate-300">{busiestHour.bookings} appointments</p>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-slate-200">Quiet times</span>
                </div>
                <p className="text-lg font-bold text-slate-100">{quietestHours.length} hours</p>
                <p className="text-sm text-slate-300">Without appointments</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-slate-200">Average per hour</span>
                </div>
                <p className="text-lg font-bold text-slate-100">{averageBookings.toFixed(1)}</p>
                <p className="text-sm text-slate-300">appointments</p>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
