
import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

interface PeakHoursData {
  hour: number;
  count: number;
  revenue?: number;
}

interface PeakHoursInsightsProps {
  peakHours: PeakHoursData[];
  quietHours: PeakHoursData[];
}

export function PeakHoursInsights({ peakHours, quietHours }: PeakHoursInsightsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Peak Hours */}
      <div className="space-y-3">
        <h4 className="font-semibold text-slate-200 flex items-center gap-2">
          🔥 Drukste Uren
        </h4>
        <div className="space-y-2">
          {peakHours.map((hour, index) => (
            <motion.div
              key={hour.hour}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 bg-red-900/30 rounded-lg border border-red-800/40"
            >
              <div className="flex items-center gap-3">
                <Badge variant="destructive" className="text-xs bg-red-700/80">
                  #{index + 1}
                </Badge>
                <span className="font-medium text-slate-200">{hour.hour}:00 - {hour.hour + 1}:00</span>
              </div>
              <div className="text-right">
                <p className="font-bold text-red-300">{hour.count} boekingen</p>
                {hour.revenue && hour.revenue > 0 && (
                  <p className="text-xs text-red-400">€{hour.revenue.toFixed(2)}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="space-y-3">
        <h4 className="font-semibold text-slate-200 flex items-center gap-2">
          😌 Rustige Uren
        </h4>
        <div className="space-y-2">
          {quietHours.map((hour, index) => (
            <motion.div
              key={hour.hour}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 bg-green-900/30 rounded-lg border border-green-800/40"
            >
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-xs bg-green-800/50 text-green-300 border-green-700/50">
                  #{index + 1}
                </Badge>
                <span className="font-medium text-slate-200">{hour.hour}:00 - {hour.hour + 1}:00</span>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-300">{hour.count} boekingen</p>
                {hour.revenue && hour.revenue > 0 && (
                  <p className="text-xs text-green-400">€{hour.revenue.toFixed(2)}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
