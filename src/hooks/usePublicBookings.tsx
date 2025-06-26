import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Booking } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export const usePublicBookings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const createPublicBooking = async (
    calendarId: string,
    bookingData: Partial<Booking>
  ) => {
    setLoading(true);

    // Ensure required fields are present - email is now optional
    if (!bookingData.customer_name || 
        !bookingData.start_time || !bookingData.end_time) {
      toast({
        title: "Error",
        description: "Customer name, start time, and end time are required",
        variant: "destructive",
      });
      setLoading(false);
      return null;
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
          description: "This time slot is no longer available",
          variant: "destructive",
        });
        setLoading(false);
        return null;
      }

      const { data, error } = await supabase
        .from('bookings')
        .insert({
          calendar_id: calendarId,
          service_type_id: bookingData.service_type_id,
          customer_name: bookingData.customer_name,
          customer_email: bookingData.customer_email || null, // Allow null
          customer_phone: bookingData.customer_phone,
          start_time: bookingData.start_time,
          end_time: bookingData.end_time,
          notes: bookingData.notes,
          total_price: bookingData.total_price
        })
        .select()
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create booking",
          variant: "destructive",
        });
        setLoading(false);
        return null;
      }

      toast({
        title: "Success",
        description: bookingData.customer_email 
          ? "Booking created successfully! Check your email for confirmation."
          : "Booking created successfully!",
      });

      setLoading(false);
      // Type assertion for the returned booking data
      return {
        ...data,
        status: data.status as 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show'
      };
    } catch (error) {
      console.error('Error creating public booking:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      setLoading(false);
      return null;
    }
  };

  const getBookingByToken = async (confirmationToken: string) => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('confirmation_token', confirmationToken)
        .single();

      if (error || !data) {
        toast({
          title: "Error",
          description: "Booking not found",
          variant: "destructive",
        });
        setLoading(false);
        return null;
      }

      setLoading(false);
      // Type assertion for the returned booking data
      return {
        ...data,
        status: data.status as 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show'
      };
    } catch (error) {
      console.error('Error fetching booking by token:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      setLoading(false);
      return null;
    }
  };

  const cancelPublicBooking = async (confirmationToken: string, reason?: string) => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason
        })
        .eq('confirmation_token', confirmationToken);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to cancel booking",
          variant: "destructive",
        });
        setLoading(false);
        return false;
      }

      toast({
        title: "Success",
        description: "Booking cancelled successfully",
      });

      setLoading(false);
      return true;
    } catch (error) {
      console.error('Error cancelling public booking:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      setLoading(false);
      return false;
    }
  };

  const checkBookingConflicts = async (
    calendarId: string,
    startTime: string,
    endTime: string
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('check_booking_conflicts', {
        p_calendar_id: calendarId,
        p_start_time: startTime,
        p_end_time: endTime,
        p_exclude_booking_id: null
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
    loading,
    createPublicBooking,
    getBookingByToken,
    cancelPublicBooking,
    checkBookingConflicts
  };
};
