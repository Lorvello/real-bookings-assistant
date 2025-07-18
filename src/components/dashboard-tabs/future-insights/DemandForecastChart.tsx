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
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis 
            dataKey="week_number" 
            stroke="#64748b"
            fontSize={12}
            tickFormatter={(value) => `Week ${value}`}
          />
          <YAxis stroke="#64748b" fontSize={12} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1e293b', 
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#f1f5f9'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="bookings" 
            stroke="#a855f7" 
            strokeWidth={2}
            dot={{ fill: '#a855f7', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}