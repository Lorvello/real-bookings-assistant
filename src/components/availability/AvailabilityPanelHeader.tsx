
import React from 'react';
import { Calendar } from 'lucide-react';

export function AvailabilityPanelHeader() {
  return (
    <div className="flex items-center gap-3 p-4 bg-card/80 backdrop-blur-sm border-b border-border/40 rounded-t-3xl">
      <div className="p-2 bg-primary/20 rounded-2xl">
        <Calendar className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">Beschikbaarheid</h2>
        <p className="text-xs text-muted-foreground">Beheer je werkschema</p>
      </div>
    </div>
  );
}
