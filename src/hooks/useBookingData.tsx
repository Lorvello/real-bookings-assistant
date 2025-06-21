
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ServiceType {
  id: string;
  calendar_id: string;
  name: string;
  duration: number;
  color: string;
}

interface Booking {
  id: string;
  calendar_id: string;
  service_type_id: string | null;
  customer_name: string;
  customer_email: string;
  start_time: string;
  end_time: string;
  status: string;
  service_types?: ServiceType;
}

export const useBookingData = (calendarId?: string) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch bookings with service type details
  const fetchBookings = async () => {
    if (!calendarId) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          service_types (
            id,
            name,
            duration,
            color
          )
        `)
        .eq('calendar_id', calendarId)
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

  // Fetch service types
  const fetchServiceTypes = async () => {
    if (!calendarId) return;

    try {
      const { data, error } = await supabase
        .from('service_types')
        .select('*')
        .eq('calendar_id', calendarId);

      if (error) {
        throw error;
      }

      setServiceTypes(data || []);
    } catch (err) {
      console.error('Error fetching service types:', err);
    }
  };

  // Setup real-time subscription
  useEffect(() => {
    if (!calendarId) return;

    // Initial data fetch
    fetchBookings();
    fetchServiceTypes();

    // Setup real-time subscription for bookings
    const bookingsChannel = supabase
      .channel('bookings_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `calendar_id=eq.${calendarId}`,
        },
        (payload) => {
          console.log('Booking real-time update:', payload);
          // Refresh bookings on any change
          fetchBookings();
        }
      )
      .subscribe();

    // Setup real-time subscription for service types
    const serviceTypesChannel = supabase
      .channel('service_types_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_types',
          filter: `calendar_id=eq.${calendarId}`,
        },
        (payload) => {
          console.log('Service type real-time update:', payload);
          fetchServiceTypes();
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(serviceTypesChannel);
    };
  }, [calendarId]);

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
    serviceTypes,
    loading,
    error,
    getBookingsForDate,
    formatBookingTime,
    refetch: fetchBookings
  };
};
