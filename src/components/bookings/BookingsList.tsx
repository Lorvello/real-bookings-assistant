
import React from 'react';
import { BookingCard } from './BookingCard';
import { BookingsEmptyState } from './BookingsEmptyState';

interface BookingsListProps {
  bookings: any[];
  loading: boolean;
  hasFilters: boolean;
  onBookingClick: (booking: any) => void;
}

export function BookingsList({ bookings, loading, hasFilters, onBookingClick }: BookingsListProps) {
  if (loading) {
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 bg-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-gray-300">Loading bookings...</div>
          </div>
        </div>
      </div>
    );
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
