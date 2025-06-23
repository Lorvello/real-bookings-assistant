
import React from 'react';
import { Calendar } from 'lucide-react';

export function AvailabilityPanelHeader() {
  return (
    <div className="flex-shrink-0 p-4 border-b border-border bg-card">
      <div className="flex items-center gap-3">
        <Calendar className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Beschikbaarheid</h2>
      </div>
    </div>
  );
}
