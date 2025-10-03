
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
  if (intensity > 0.8) return 'rgb(220, 38, 38)'; // Red for very busy
  if (intensity > 0.6) return 'rgb(234, 88, 12)'; // Orange for busy
  if (intensity > 0.4) return 'rgb(202, 138, 4)'; // Yellow for moderate
  if (intensity > 0.2) return 'rgb(22, 163, 74)'; // Green for quiet
  return 'rgb(100, 116, 139)'; // Gray for very quiet
};

export function PeakHoursBarChart({ data, maxCount }: PeakHoursBarChartProps) {
  return (
    <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(71, 85, 105)" />
          <XAxis 
            dataKey="hour" 
            tickFormatter={(hour) => `${hour}:00`}
            fontSize={12}
            stroke="rgb(148, 163, 184)"
          />
          <YAxis fontSize={12} stroke="rgb(148, 163, 184)" />
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
