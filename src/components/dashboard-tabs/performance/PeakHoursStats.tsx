
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
      <div className="bg-gradient-to-br from-slate-800/70 to-slate-700/50 rounded-xl p-4 border border-slate-600/30">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-slate-300" />
          <div>
            <p className="text-sm font-medium text-slate-400">Totaal Boekingen</p>
            <p className="text-2xl font-bold text-slate-100">{totalBookings}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/30 rounded-xl p-4 border border-emerald-700/30">
        <div className="flex items-center gap-3">
          <Euro className="h-8 w-8 text-emerald-400" />
          <div>
            <p className="text-sm font-medium text-emerald-300">Omzet</p>
            <p className="text-2xl font-bold text-emerald-100">€{totalRevenue.toFixed(2)}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/30 rounded-xl p-4 border border-blue-700/30">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-blue-400" />
          <div>
            <p className="text-sm font-medium text-blue-300">Piek Moment</p>
            <p className="text-2xl font-bold text-blue-100">
              {topPeakHour !== null ? `${topPeakHour}:00` : 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
