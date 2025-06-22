
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartTooltip } from './ChartTooltip';

interface ServicePerformanceData {
  service_name: string;
  booking_count: number;
  revenue: number;
  avg_price: number;
}

interface ServiceChartProps {
  data: ServicePerformanceData[];
}

export function ServiceChart({ data }: ServiceChartProps) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.2} />
            </linearGradient>
            <linearGradient id="bookingGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.2} />
            </linearGradient>
          </defs>
          
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#475569" 
            opacity={0.3}
          />
          
          <XAxis 
            dataKey="service_name" 
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={{ stroke: '#475569' }}
            tickLine={{ stroke: '#475569' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          
          <YAxis 
            yAxisId="bookings"
            orientation="left"
            tick={{ fill: '#3b82f6', fontSize: 12 }}
            axisLine={{ stroke: '#3b82f6', opacity: 0.5 }}
            tickLine={{ stroke: '#3b82f6', opacity: 0.5 }}
          />
          
          <YAxis 
            yAxisId="revenue"
            orientation="right"
            tick={{ fill: '#10b981', fontSize: 12 }}
            axisLine={{ stroke: '#10b981', opacity: 0.5 }}
            tickLine={{ stroke: '#10b981', opacity: 0.5 }}
          />
          
          <Tooltip 
            content={<ChartTooltip />}
            cursor={{ 
              fill: 'rgba(148, 163, 184, 0.1)',
              stroke: 'rgba(148, 163, 184, 0.3)',
              strokeWidth: 1
            }}
          />
          
          <Bar 
            yAxisId="bookings"
            dataKey="booking_count" 
            fill="url(#bookingGradient)"
            radius={[4, 4, 0, 0]}
            name="Boekingen"
          />
          
          <Bar 
            yAxisId="revenue"
            dataKey="revenue" 
            fill="url(#revenueGradient)"
            radius={[4, 4, 0, 0]}
            name="Omzet (€)"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
