
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AppointmentType {
  id: string;
  company_id: string;
  name: string;
  duration_min: number;
  color: string;
}

interface Booking {
  id: string;
  company_id: string;
  appointment_type_id: string;
  booked_by_name: string;
  booked_by_email: string;
  start_time: string;
  end_time: string;
  status: string;
  appointment_types?: AppointmentType;
}

export const useBookingData = (companyId?: string) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch bookings with appointment type details
  const fetchBookings = async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          appointment_types (
            id,
            name,
            duration_min,
            color
          )
        `)
        .eq('company_id', companyId)
        .order('start_time', { ascending: true });

      if (error) {
        throw error;
      }

      setBookings(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Er is een fout opgetreden bij het ophalen van bookings';
      setError(errorMessage);
      console.error('Error fetching bookings:', err);
      
      toast({
        title: "Fout bij ophalen gegevens",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch appointment types
  const fetchAppointmentTypes = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from('appointment_types')
        .select('*')
        .eq('company_id', companyId);

      if (error) {
        throw error;
      }

      setAppointmentTypes(data || []);
    } catch (err) {
      console.error('Error fetching appointment types:', err);
    }
  };

  // Setup real-time subscription
  useEffect(() => {
    if (!companyId) return;

    // Initial data fetch
    fetchBookings();
    fetchAppointmentTypes();

    // Setup real-time subscription for bookings
    const bookingsChannel = supabase
      .channel('bookings_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          console.log('Booking real-time update:', payload);
          // Refresh bookings on any change
          fetchBookings();
        }
      )
      .subscribe();

    // Setup real-time subscription for appointment types
    const appointmentTypesChannel = supabase
      .channel('appointment_types_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointment_types',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          console.log('Appointment type real-time update:', payload);
          fetchAppointmentTypes();
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(appointmentTypesChannel);
    };
  }, [companyId]);

  // Helper function to get bookings for a specific date
  const getBookingsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.start_time).toISOString().split('T')[0];
      return bookingDate === dateString;
    });
  };

  // Helper function to format booking time
  const formatBookingTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return `${start.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return {
    bookings,
    appointmentTypes,
    loading,
    error,
    getBookingsForDate,
    formatBookingTime,
    refetch: fetchBookings
  };
};
