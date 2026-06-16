
import React from 'react';
import { Calendar, Euro, TrendingUp } from 'lucide-react';

interface PeakHoursStatsProps {
  totalBookings: number;
  totalRevenue: number;
  topPeakHour: number | null;
}

export function PeakHoursStats({ totalBookings, totalRevenue, topPeakHour }: PeakHoursStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-muted/40 rounded-xl p-4 border border-white/[0.08]">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-subtle-foreground" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
            <p className="text-2xl font-semibold text-foreground">{totalBookings}</p>
          </div>
        </div>
      </div>

      <div className="bg-gold/10 rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-3">
          <Euro className="h-8 w-8 text-gold-foreground" />
          <div>
            <p className="text-sm font-medium text-gold-foreground">Revenue</p>
            <p className="text-2xl font-semibold text-foreground">€{totalRevenue.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="bg-muted/40 rounded-xl p-4 border border-white/[0.08]">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-subtle-foreground" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Piek Moment</p>
            <p className="text-2xl font-semibold text-foreground">
              {topPeakHour !== null ? `${topPeakHour}:00` : 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
