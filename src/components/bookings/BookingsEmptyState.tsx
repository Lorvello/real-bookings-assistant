
import React from 'react';
import { Calendar } from 'lucide-react';

interface BookingsEmptyStateProps {
  hasFilters: boolean;
}

export function BookingsEmptyState({ hasFilters }: BookingsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center py-12">
      <div className="glow-accent relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
        <Calendar className="h-6 w-6 text-accent-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        {hasFilters ? 'No bookings found' : 'No bookings yet'}
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        {hasFilters
          ? 'Try adjusting your search or filters.'
          : 'Your first booking will appear here when it is created.'}
      </p>
    </div>
  );
}
