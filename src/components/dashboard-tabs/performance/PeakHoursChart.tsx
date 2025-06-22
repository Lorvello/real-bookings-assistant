
import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Activity } from 'lucide-react';

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

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis 
            dataKey="hour_label" 
            stroke="#94A3B8"
            fontSize={12}
            tick={{ fill: '#94A3B8' }}
          />
          <YAxis 
            stroke="#94A3B8" 
            fontSize={12}
            tick={{ fill: '#94A3B8' }}
          />
          <Tooltip 
            formatter={(value, name) => [value, 'Boekingen']}
            labelFormatter={(label) => `${label}`}
            contentStyle={{
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '12px',
              color: '#F1F5F9',
              backdropFilter: 'blur(8px)'
            }}
            cursor={{ fill: 'rgba(34, 197, 94, 0.1)' }}
          />
          <Bar 
            dataKey="bookings" 
            fill="url(#greenGradient)"
            radius={[4, 4, 0, 0]}
            stroke="rgba(34, 197, 94, 0.5)"
            strokeWidth={1}
          />
          <defs>
            <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#16A34A" stopOpacity="0.6"/>
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
