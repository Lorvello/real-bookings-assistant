import React, { useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { BookingCard } from './BookingCard';
import { BookingsEmptyState } from './BookingsEmptyState';
import { BookingsListSkeleton } from '@/components/loading/BookingsListSkeleton';

interface VirtualizedBookingsListProps {
  bookings: any[];
  loading: boolean;
  hasFilters: boolean;
  onBookingClick: (booking: any) => void;
}

const ITEM_HEIGHT = 180;
const OVERSCAN = 5;
const VIRTUALIZATION_THRESHOLD = 20;

// Memoized booking card to prevent unnecessary re-renders
const MemoizedBookingCard = React.memo(BookingCard, (prev, next) => {
  return prev.booking.id === next.booking.id && 
         prev.booking.status === next.booking.status;
});

export function VirtualizedBookingsList({ 
  bookings, 
  loading, 
  hasFilters, 
  onBookingClick 
}: VirtualizedBookingsListProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  // Only virtualize if we have many bookings
  const shouldVirtualize = bookings.length > VIRTUALIZATION_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: bookings.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: OVERSCAN,
    enabled: shouldVirtualize,
  });

  const items = useMemo(() => {
    if (shouldVirtualize) {
      return virtualizer.getVirtualItems();
    }
    return bookings.map((_, index) => ({ index, start: 0, size: ITEM_HEIGHT }));
  }, [shouldVirtualize, virtualizer, bookings]);

  if (loading) {
    return <BookingsListSkeleton />;
  }

  if (bookings.length === 0) {
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-6">
        <BookingsEmptyState hasFilters={hasFilters} />
      </div>
    );
  }

  return (
    <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-6">
      {shouldVirtualize ? (
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{
            height: '600px',
            contain: 'strict',
          }}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {items.map((virtualRow) => {
              const booking = bookings[virtualRow.index];
              return (
                <div
                  key={booking.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="pb-4">
                    <MemoizedBookingCard
                      booking={booking}
                      onBookingClick={onBookingClick}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <MemoizedBookingCard
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
