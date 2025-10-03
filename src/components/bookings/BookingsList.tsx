
import React from 'react';
import { BookingCard } from './BookingCard';
import { BookingsEmptyState } from './BookingsEmptyState';
import { BookingsListSkeleton } from '@/components/loading/BookingsListSkeleton';

interface BookingsListProps {
  bookings: any[];
  loading: boolean;
  hasFilters: boolean;
  onBookingClick: (booking: any) => void;
}

export function BookingsList({ bookings, loading, hasFilters, onBookingClick }: BookingsListProps) {
  if (loading) {
    return <BookingsListSkeleton />;
  }

  return (
    <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-6">
      {bookings.length === 0 ? (
        <BookingsEmptyState hasFilters={hasFilters} />
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <BookingCard 
              key={booking.id}
              booking={booking}
              onBookingClick={onBookingClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
