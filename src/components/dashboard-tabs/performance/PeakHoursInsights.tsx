
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
        <h4 className="font-semibold text-foreground flex items-center gap-2">
          🔥 Drukste Uren
        </h4>
        <div className="space-y-2">
          {peakHours.map((hour, index) => (
            <motion.div
              key={hour.hour}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 bg-rose-500/10 rounded-lg border border-rose-500/20"
            >
              <div className="flex items-center gap-3">
                <Badge variant="destructive" className="text-xs bg-rose-500/20 text-rose-400">
                  #{index + 1}
                </Badge>
                <span className="font-medium text-foreground">{hour.hour}:00 - {hour.hour + 1}:00</span>
              </div>
              <div className="text-right">
                <p className="font-semibold text-rose-400">{hour.count} boekingen</p>
                {hour.revenue && hour.revenue > 0 && (
                  <p className="text-xs text-rose-400">€{hour.revenue.toFixed(2)}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="space-y-3">
        <h4 className="font-semibold text-foreground flex items-center gap-2">
          😌 Rustige Uren
        </h4>
        <div className="space-y-2">
          {quietHours.map((hour, index) => (
            <motion.div
              key={hour.hour}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20"
            >
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/20">
                  #{index + 1}
                </Badge>
                <span className="font-medium text-foreground">{hour.hour}:00 - {hour.hour + 1}:00</span>
              </div>
              <div className="text-right">
                <p className="font-semibold text-emerald-400">{hour.count} boekingen</p>
                {hour.revenue && hour.revenue > 0 && (
                  <p className="text-xs text-emerald-400">€{hour.revenue.toFixed(2)}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
