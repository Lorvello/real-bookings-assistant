
import React from 'react';
import { Calendar } from 'lucide-react';

interface BookingsEmptyStateProps {
  hasFilters: boolean;
}

export function BookingsEmptyState({ hasFilters }: BookingsEmptyStateProps) {
  return (
    <div className="text-center py-12">
      <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {hasFilters ? 'No bookings found' : 'No bookings yet'}
      </h3>
      <p className="text-muted-foreground">
        {hasFilters 
          ? 'Try adjusting your search or filters.'
          : 'Your first booking will appear here when it is created.'}
      </p>
    </div>
  );
}
