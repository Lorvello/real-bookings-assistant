
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
      {/* DESIGN_SPEC §2 — serif-editorial headline for the warm onboarding empty state;
          the filtered "no results" stays crisp sans (utilitarian, not a warm moment). */}
      {hasFilters ? (
        <h3 className="mb-1 text-lg font-semibold text-foreground">No bookings found</h3>
      ) : (
        <h3 className="mb-1 font-serif text-2xl italic text-foreground">Nothing booked yet</h3>
      )}
      <p className="text-sm text-muted-foreground max-w-xs">
        {hasFilters
          ? 'Try adjusting your search or filters.'
          : 'Your first booking will appear here the moment a customer books over WhatsApp.'}
      </p>
    </div>
  );
}
