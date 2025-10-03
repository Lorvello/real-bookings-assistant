import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DemandForecastChartProps {
  data?: Array<{
    week_number: number;
    bookings: number;
    trend_direction: string;
  }>;
}

export function DemandForecastChart({ data }: DemandForecastChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center">
        <h3 className="text-lg font-semibold text-slate-100 mb-2">Demand Forecast</h3>
        <p className="text-slate-400">No forecast data available</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h3 className="text-lg font-semibold text-slate-100 mb-6">Demand Forecast</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(51, 65, 85)" />
          <XAxis 
            dataKey="week_number" 
            stroke="rgb(100, 116, 139)"
            fontSize={12}
            tickFormatter={(value) => `Week ${value}`}
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
          <Line 
            type="monotone" 
            dataKey="bookings" 
            stroke="rgb(168, 85, 247)" 
            strokeWidth={2}
            dot={{ fill: 'rgb(168, 85, 247)', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}