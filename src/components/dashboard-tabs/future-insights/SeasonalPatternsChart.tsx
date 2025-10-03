import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SeasonalPatternsChartProps {
  data?: Array<{
    month_name: string;
    avg_bookings: number;
  }>;
}

export function SeasonalPatternsChart({ data }: SeasonalPatternsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center">
        <h3 className="text-lg font-semibold text-slate-100 mb-2">Seasonal Patterns</h3>
        <p className="text-slate-400">No seasonal data available</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h3 className="text-lg font-semibold text-slate-100 mb-6">Seasonal Patterns</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(51, 65, 85)" />
          <XAxis 
            dataKey="month_name" 
            stroke="rgb(100, 116, 139)"
            fontSize={12}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis stroke="rgb(100, 116, 139)" fontSize={12} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgb(30, 41, 59)', 
              border: '1px solid rgb(51, 65, 85)',
              borderRadius: '8px',
              color: 'rgb(241, 245, 249)'
            }}
          />
          <Bar 
            dataKey="avg_bookings" 
            fill="rgb(168, 85, 247)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}