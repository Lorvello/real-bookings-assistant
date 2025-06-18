
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Booking } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export const useBookings = (calendarId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && calendarId) {
      fetchBookings();
    } else {
      setBookings([]);
      setLoading(false);
    }
  }, [user, calendarId]);

  const fetchBookings = async () => {
    if (!calendarId) return;

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('calendar_id', calendarId)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching bookings:', error);
        return;
      }

      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const createBooking = async (bookingData: Partial<Booking>) => {
    if (!calendarId) return;

    // Ensure required fields are present
    if (!bookingData.customer_name || !bookingData.customer_email || 
        !bookingData.start_time || !bookingData.end_time) {
      toast({
        title: "Error",
        description: "Customer name, email, start time, and end time are required",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check for conflicts first
      const hasConflicts = await checkBookingConflicts(
        calendarId,
        bookingData.start_time,
        bookingData.end_time
      );

      if (hasConflicts) {
        toast({
          title: "Conflict",
          description: "This time slot conflicts with an existing booking",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('bookings')
        .insert({
          calendar_id: calendarId,
          service_type_id: bookingData.service_type_id,
          customer_name: bookingData.customer_name,
          customer_email: bookingData.customer_email,
          customer_phone: bookingData.customer_phone,
          start_time: bookingData.start_time,
          end_time: bookingData.end_time,
          status: bookingData.status || 'pending',
          notes: bookingData.notes,
          internal_notes: bookingData.internal_notes,
          total_price: bookingData.total_price
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create booking",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Booking created successfully",
      });

      await fetchBookings();
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const updateBooking = async (id: string, updates: Partial<Booking>) => {
    try {
      // If updating times, check for conflicts
      if (updates.start_time || updates.end_time) {
        const booking = bookings.find(b => b.id === id);
        if (booking) {
          const hasConflicts = await checkBookingConflicts(
            booking.calendar_id,
            updates.start_time || booking.start_time,
            updates.end_time || booking.end_time,
            id
          );

          if (hasConflicts) {
            toast({
              title: "Conflict",
              description: "This time slot conflicts with an existing booking",
              variant: "destructive",
            });
            return;
          }
        }
      }

      const { error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update booking",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Booking updated successfully",
      });

      await fetchBookings();
    } catch (error) {
      console.error('Error updating booking:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const cancelBooking = async (id: string, reason?: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason
        })
        .eq('id', id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to cancel booking",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Booking cancelled successfully",
      });

      await fetchBookings();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const confirmBooking = async (id: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to confirm booking",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Booking confirmed successfully",
      });

      await fetchBookings();
    } catch (error) {
      console.error('Error confirming booking:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const deleteBooking = async (id: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete booking",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Booking deleted successfully",
      });

      await fetchBookings();
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const checkBookingConflicts = async (
    calendarId: string,
    startTime: string,
    endTime: string,
    excludeBookingId?: string
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('check_booking_conflicts', {
        p_calendar_id: calendarId,
        p_start_time: startTime,
        p_end_time: endTime,
        p_exclude_booking_id: excludeBookingId || null
      });

      if (error) {
        console.error('Error checking booking conflicts:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Error checking booking conflicts:', error);
      return false;
    }
  };

  return {
    bookings,
    loading,
    createBooking,
    updateBooking,
    cancelBooking,
    confirmBooking,
    deleteBooking,
    checkBookingConflicts,
    refetch: fetchBookings
  };
};
