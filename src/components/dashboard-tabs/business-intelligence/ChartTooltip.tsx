
import React from 'react';

export function ChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl p-4 rounded-xl">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-200 border-b border-slate-700/30 pb-2">
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded shadow-lg"
                  style={{ 
                    backgroundColor: entry.color,
                    boxShadow: `0 0 10px ${entry.color}40`
                  }}
                ></div>
                <span className="text-sm text-slate-300">
                  {entry.name === 'booking_count' ? 'Boekingen' : 
                   entry.name === 'revenue' ? 'Omzet' : entry.name}
                </span>
              </div>
              <span className="text-sm font-bold text-slate-100">
                {entry.name === 'revenue' || entry.dataKey === 'revenue' 
                  ? `€${Number(entry.value).toFixed(2)}` 
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}
