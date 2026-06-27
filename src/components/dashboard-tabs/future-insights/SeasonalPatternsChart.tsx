import React from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SeasonalPatternsChartProps {
  data?: Array<{
    month_name: string;
    avg_bookings: number;
  }>;
}

export function SeasonalPatternsChart({ data }: SeasonalPatternsChartProps) {
  const { t } = useTranslation('dashboard');
  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center">
        <h3 className="text-lg font-semibold text-foreground mb-2">{t('dashboard.futureInsights.seasonal.title', 'Seasonal Patterns')}</h3>
        <p className="text-muted-foreground">{t('dashboard.futureInsights.seasonal.empty', 'No seasonal data available')}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h3 className="text-lg font-semibold text-foreground mb-6">{t('dashboard.futureInsights.seasonal.title', 'Seasonal Patterns')}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="month_name" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            angle={-45}
            textAnchor="end"
            height={80}
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
          <Bar 
            dataKey="avg_bookings" 
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}