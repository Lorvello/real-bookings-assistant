
import React from 'react';
import { TrendingUp } from 'lucide-react';

export function ServiceEmptyState() {
  return (
    <div className="text-center py-16">
      <div className="relative w-20 h-20 mx-auto mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-muted/30 to-muted/20 blur-xl rounded-full"></div>
        <div className="relative w-full h-full bg-gradient-to-br from-muted/50 to-card/50 rounded-2xl flex items-center justify-center border border-white/[0.08]">
          <TrendingUp className="h-10 w-10 text-muted-foreground" />
        </div>
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">No service data available yet</h3>
      <p className="text-muted-foreground max-w-md mx-auto">
        Service performance will be displayed once bookings are made for different services.
      </p>
    </div>
  );
}
