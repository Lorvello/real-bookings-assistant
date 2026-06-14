
import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Euro } from 'lucide-react';

interface PeakHoursTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

export function PeakHoursTooltip({ active, payload, label }: PeakHoursTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-background/98 via-card/95 to-background/90 backdrop-blur-3xl border border-white/[0.08] shadow-2xl p-4 rounded-2xl"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-foreground" />
            <span className="font-semibold text-foreground">{label}:00 - {(parseInt(label || '0') + 1)}:00</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-muted-foreground rounded-full"></div>
              <span className="text-foreground">{data.count} boekingen</span>
            </div>
            {data.revenue && (
              <div className="flex items-center gap-2">
                <Euro className="h-3 w-3 text-emerald-400" />
                <span className="text-foreground">€{data.revenue.toFixed(2)}</span>
              </div>
            )}
          </div>
          {data.popular_service && (
            <div className="pt-2 border-t border-white/[0.08]">
              <span className="text-xs text-muted-foreground">Populairste service:</span>
              <p className="font-medium text-xs text-foreground">{data.popular_service}</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  }
  return null;
}
