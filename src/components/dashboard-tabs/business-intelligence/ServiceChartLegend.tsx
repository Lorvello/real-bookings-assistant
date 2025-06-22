
import React from 'react';

export function ServiceChartLegend() {
  return (
    <div className="flex items-center justify-center gap-8">
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-blue-400 rounded shadow-lg shadow-blue-500/25"></div>
        <span className="text-sm font-medium text-slate-300">Aantal Boekingen</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded shadow-lg shadow-emerald-500/25"></div>
        <span className="text-sm font-medium text-slate-300">Omzet (€)</span>
      </div>
    </div>
  );
}
