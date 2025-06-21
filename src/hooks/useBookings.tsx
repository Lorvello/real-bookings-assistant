
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
}

export const useBookings = (calendarId?: string) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !calendarId) {
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
            )
          `)
          .eq('calendar_id', calendarId)
          .order('start_time', { ascending: true });

        if (fetchError) {
          console.error('Error fetching bookings:', fetchError);
          setError('Er is een fout opgetreden bij het ophalen van boekingen');
          return;
        }

        // Transform data to match our interface
        const transformedBookings: BookingData[] = (data || []).map(booking => ({
          ...booking,
          status: booking.status as 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show'
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

    // Set up real-time subscription
    const channel = supabase
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
          console.log('Real-time booking update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newBooking = {
              ...payload.new,
              status: payload.new.status as 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show'
            } as BookingData;
            setBookings(prev => [...prev, newBooking]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedBooking = {
              ...payload.new,
              status: payload.new.status as 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show'
            } as BookingData;
            setBookings(prev => 
              prev.map(booking => 
                booking.id === updatedBooking.id ? { ...booking, ...updatedBooking } : booking
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setBookings(prev => 
              prev.filter(booking => booking.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, calendarId]);

  return {
    bookings,
    loading,
    error,
    refetch: () => {
      if (user && calendarId) {
        setLoading(true);
        // Trigger re-fetch by updating the effect dependency
      }
    }
  };
};
