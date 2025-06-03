
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

/**
 * 📅 CAL.COM BOOKING OPERATIONS
 * =============================
 * 
 * Alle booking operaties verlopen nu via Cal.com API
 * via onze Supabase Edge Functions
 */

export interface BookingData {
  eventTypeId: string;
  start: string;
  end: string;
  attendee: {
    name: string;
    email: string;
    timeZone?: string;
  };
  title?: string;
  description?: string;
}

export const createCalcomBooking = async (user: User, bookingData: BookingData) => {
  try {
    console.log('[CalcomBookings] Creating booking for user:', user.id);

    const { data, error } = await supabase.functions.invoke('calcom-bookings', {
      body: {
        action: 'create',
        user_id: user.id,
        booking_data: bookingData
      }
    });

    if (error) {
      console.error('[CalcomBookings] Create error:', error);
      throw new Error(`Failed to create booking: ${error.message}`);
    }

    if (!data.success) {
      throw new Error(`Booking creation failed: ${data.error}`);
    }

    console.log('[CalcomBookings] Booking created successfully:', data.booking.id);
    return data.booking;
  } catch (error) {
    console.error('[CalcomBookings] Unexpected error:', error);
    throw error;
  }
};

export const updateCalcomBooking = async (user: User, bookingId: string, updates: Partial<BookingData>) => {
  try {
    console.log('[CalcomBookings] Updating booking:', bookingId);

    const { data, error } = await supabase.functions.invoke('calcom-bookings', {
      body: {
        action: 'update',
        user_id: user.id,
        booking_data: {
          booking_id: bookingId,
          updates: updates
        }
      }
    });

    if (error) {
      console.error('[CalcomBookings] Update error:', error);
      throw new Error(`Failed to update booking: ${error.message}`);
    }

    if (!data.success) {
      throw new Error(`Booking update failed: ${data.error}`);
    }

    console.log('[CalcomBookings] Booking updated successfully');
    return data.booking;
  } catch (error) {
    console.error('[CalcomBookings] Unexpected error:', error);
    throw error;
  }
};

export const cancelCalcomBooking = async (user: User, bookingId: string) => {
  try {
    console.log('[CalcomBookings] Cancelling booking:', bookingId);

    const { data, error } = await supabase.functions.invoke('calcom-bookings', {
      body: {
        action: 'cancel',
        user_id: user.id,
        booking_data: {
          booking_id: bookingId
        }
      }
    });

    if (error) {
      console.error('[CalcomBookings] Cancel error:', error);
      throw new Error(`Failed to cancel booking: ${error.message}`);
    }

    if (!data.success) {
      throw new Error(`Booking cancellation failed: ${data.error}`);
    }

    console.log('[CalcomBookings] Booking cancelled successfully');
    return true;
  } catch (error) {
    console.error('[CalcomBookings] Unexpected error:', error);
    throw error;
  }
};

export const fetchCalcomBookings = async (user: User) => {
  try {
    console.log('[CalcomBookings] Fetching bookings for user:', user.id);

    const { data, error } = await supabase.functions.invoke('calcom-bookings', {
      body: {
        action: 'list',
        user_id: user.id
      }
    });

    if (error) {
      console.error('[CalcomBookings] Fetch error:', error);
      throw new Error(`Failed to fetch bookings: ${error.message}`);
    }

    if (!data.success) {
      throw new Error(`Booking fetch failed: ${data.error}`);
    }

    console.log('[CalcomBookings] Bookings fetched successfully:', data.bookings.length);
    return data.bookings;
  } catch (error) {
    console.error('[CalcomBookings] Unexpected error:', error);
    throw error;
  }
};
