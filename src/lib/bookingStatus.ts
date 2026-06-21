// Canonical booking-status semantics for dashboard metrics.
// The booking.status enum is: pending | confirmed | cancelled | completed | no-show.
//
// A "real" booking for any VOLUME / demand / "is it booked" / upcoming metric is everything
// EXCEPT cancelled. Use COUNTED_BOOKING_STATUSES for those queries so the dashboard cards
// reconcile with each other: a `confirmed`-only filter silently drops bookings the moment an
// owner marks them completed or no-show, which made Popular Service disagree with Weekly Growth.
export const COUNTED_BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'completed',
  'no-show',
] as const;
