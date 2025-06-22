
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { PeakHoursTooltip } from './PeakHoursTooltip';

interface PeakHoursData {
  hour: number;
  count: number;
  revenue?: number;
  avg_booking_value?: number;
  popular_service?: string;
}

interface PeakHoursBarChartProps {
  data: PeakHoursData[];
  maxCount: number;
}

const getBarColor = (count: number, maxCount: number) => {
  const intensity = count / maxCount;
  if (intensity > 0.8) return '#dc2626'; // Red for very busy
  if (intensity > 0.6) return '#ea580c'; // Orange for busy
  if (intensity > 0.4) return '#ca8a04'; // Yellow for moderate
  if (intensity > 0.2) return '#16a34a'; // Green for quiet
  return '#64748b'; // Gray for very quiet
};

export function PeakHoursBarChart({ data, maxCount }: PeakHoursBarChartProps) {
  return (
    <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
          <XAxis 
            dataKey="hour" 
            tickFormatter={(hour) => `${hour}:00`}
            fontSize={12}
            stroke="#94a3b8"
          />
          <YAxis fontSize={12} stroke="#94a3b8" />
          <Tooltip content={<PeakHoursTooltip />} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getBarColor(entry.count, maxCount)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
