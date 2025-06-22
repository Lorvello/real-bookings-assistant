
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface BookingData {
  id: string;
  calendar_id: string;
  service_type_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show';
  notes?: string;
  service_name?: string;
  booking_duration?: number;
  service_types?: {
    name: string;
    color: string;
    duration: number;
  };
  calendar?: {
    name: string;
    color: string;
  };
}

export const useMultipleCalendarBookings = (calendarIds: string[]) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !calendarIds.length) {
      setBookings([]);
      setLoading(false);
      return;
    }

    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('bookings')
          .select(`
            *,
            service_types (
              name,
              color,
              duration
            ),
            calendars!inner (
              name,
              color
            )
          `)
          .in('calendar_id', calendarIds)
          .order('start_time', { ascending: true });

        if (fetchError) {
          console.error('Error fetching bookings:', fetchError);
          setError('Er is een fout opgetreden bij het ophalen van boekingen');
          return;
        }

        // Transform data to match our interface
        const transformedBookings: BookingData[] = (data || []).map(booking => ({
          ...booking,
          status: booking.status as 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show',
          calendar: booking.calendars
        }));

        setBookings(transformedBookings);
      } catch (err) {
        console.error('Error in fetchBookings:', err);
        setError('Er is een onverwachte fout opgetreden');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();

    // Set up real-time subscription for all calendars
    const channels = calendarIds.map(calendarId => {
      return supabase
        .channel(`bookings_${calendarId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookings',
            filter: `calendar_id=eq.${calendarId}`,
          },
          (payload) => {
            console.log('Real-time booking update:', payload);
            fetchBookings(); // Refetch all bookings when any changes
          }
        )
        .subscribe();
    });

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [user, calendarIds.join(',')]);

  return {
    bookings,
    loading,
    error,
    refetch: () => {
      if (user && calendarIds.length) {
        setLoading(true);
        // Trigger re-fetch by updating the effect dependency
      }
    }
  };
};
