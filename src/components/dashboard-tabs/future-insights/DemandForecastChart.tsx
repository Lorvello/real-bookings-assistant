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
        <h3 className="text-lg font-semibold text-foreground mb-2">Upcoming Bookings</h3>
        <p className="text-muted-foreground">No upcoming bookings yet</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h3 className="text-lg font-semibold text-foreground mb-6">Upcoming Bookings</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="week_number" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickFormatter={(value) => `Week ${value}`}
          />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              color: 'hsl(var(--popover-foreground))'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="bookings" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}