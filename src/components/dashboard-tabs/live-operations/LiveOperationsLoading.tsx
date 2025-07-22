
import React from 'react';

export function LiveOperationsLoading() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-gradient-to-br from-slate-800/40 to-slate-900/60 rounded-2xl animate-pulse border border-slate-700/30" />
        ))}
      </div>
    </div>
  );
}
