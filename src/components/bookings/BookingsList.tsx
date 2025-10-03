
import React from 'react';
import { VirtualizedBookingsList } from './VirtualizedBookingsList';

interface BookingsListProps {
  bookings: any[];
  loading: boolean;
  hasFilters: boolean;
  onBookingClick: (booking: any) => void;
}

export function BookingsList({ bookings, loading, hasFilters, onBookingClick }: BookingsListProps) {
  return (
    <VirtualizedBookingsList
      bookings={bookings}
      loading={loading}
      hasFilters={hasFilters}
      onBookingClick={onBookingClick}
    />
  );
}
