
import React from 'react';
import { TrendingUp, Users, Euro } from 'lucide-react';

export function ChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    
    return (
      <div className="bg-popover border border-white/[0.08] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] p-5 rounded-xl min-w-[280px]" style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}>
        <div className="space-y-4">
          {/* Service Name Header */}
          <div className="flex items-center gap-3 border-b border-white/[0.08] pb-3">
            <div className="p-2 bg-muted/40 border border-white/[0.08] rounded-lg">
              <TrendingUp className="h-4 w-4 text-subtle-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">Service Performance</p>
            </div>
          </div>

          {/* Metrics */}
          <div className="space-y-3">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {entry.dataKey === 'booking_count' ? (
                      <Users className="h-4 w-4 text-blue-400" />
                    ) : (
                      <Euro className="h-4 w-4 text-emerald-400" />
                    )}
                    <span className="text-sm text-foreground">
                      {entry.dataKey === 'booking_count' ? 'Bookings' : 'Revenue'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-foreground">
                    {entry.dataKey === 'revenue'
                      ? `€${Number(entry.value).toFixed(2)}` 
                      : entry.value}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {entry.dataKey === 'booking_count' && data?.booking_percentage
                      ? `${data.booking_percentage.toFixed(1)}% van totaal`
                      : entry.dataKey === 'revenue' && data?.revenue_percentage
                      ? `${data.revenue_percentage.toFixed(1)}% van totaal`
                      : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Additional Info */}
          {data?.avg_price && (
            <div className="border-t border-white/[0.08] pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Average price</span>
                <span className="text-sm font-semibold text-foreground">
                  €{Number(data.avg_price).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}
