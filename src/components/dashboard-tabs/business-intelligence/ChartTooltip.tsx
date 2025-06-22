
import React from 'react';
import { motion } from 'framer-motion';

export function ChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-card/98 via-card/95 to-card/90 backdrop-blur-3xl border border-primary/30 shadow-2xl p-6"
        style={{
          borderRadius: '1rem 2rem 1rem 2rem / 1.5rem 1rem 1.5rem 1rem'
        }}
      >
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-3">
              <div 
                className="w-4 h-4 shadow-lg"
                style={{ 
                  backgroundColor: entry.color, 
                  boxShadow: `0 0 15px ${entry.color}`,
                  borderRadius: '50% 80% 50% 80%'
                }}
              ></div>
              <span className="text-sm font-semibold">
                {entry.dataKey === 'revenue' ? `€${Number(entry.value).toFixed(2)}` : entry.value}
              </span>
              <span className="text-xs text-muted-foreground">
                {entry.dataKey === 'booking_count' ? 'Boekingen' : 'Omzet'}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }
  return null;
}
