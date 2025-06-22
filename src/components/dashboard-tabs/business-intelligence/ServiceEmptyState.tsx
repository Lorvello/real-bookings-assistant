
import React from 'react';
import { TrendingUp } from 'lucide-react';

export function ServiceEmptyState() {
  return (
    <div className="text-center py-16">
      <div className="relative w-20 h-20 mx-auto mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-600/30 to-slate-700/20 blur-xl rounded-full"></div>
        <div className="relative w-full h-full bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-2xl flex items-center justify-center border border-slate-600/30">
          <TrendingUp className="h-10 w-10 text-slate-400" />
        </div>
      </div>
      <h3 className="text-xl font-semibold text-slate-200 mb-2">Nog geen service data</h3>
      <p className="text-slate-400 max-w-md mx-auto">
        Service performance wordt weergegeven zodra er boekingen zijn gemaakt voor verschillende services.
      </p>
    </div>
  );
}
