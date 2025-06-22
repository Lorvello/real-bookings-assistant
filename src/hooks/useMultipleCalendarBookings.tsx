
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

  const fetchBookings = async () => {
    if (!user || !calendarIds.length) {
      setBookings([]);
      setLoading(false);
      return;
    }

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

  useEffect(() => {
    fetchBookings();
  }, [user, calendarIds.join(',')]);

  useEffect(() => {
    if (!user || !calendarIds.length) return;

    // Create a single channel for all calendar IDs to avoid duplicate subscriptions
    const channelName = `bookings_multiple_${calendarIds.sort().join('_')}`;
    console.log('Setting up realtime subscription for calendars:', calendarIds);
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: calendarIds.length === 1 ? `calendar_id=eq.${calendarIds[0]}` : undefined,
        },
        (payload) => {
          console.log('Real-time booking update:', payload);
          
          // Add proper type checking for payload
          const newCalendarId = payload.new && typeof payload.new === 'object' && 'calendar_id' in payload.new 
            ? (payload.new as any).calendar_id 
            : null;
          const oldCalendarId = payload.old && typeof payload.old === 'object' && 'calendar_id' in payload.old 
            ? (payload.old as any).calendar_id 
            : null;
          
          // Only refetch if the booking belongs to one of our calendars
          if ((newCalendarId && calendarIds.includes(newCalendarId)) || 
              (oldCalendarId && calendarIds.includes(oldCalendarId))) {
            fetchBookings();
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Cleaning up subscription for:', channelName);
      supabase.removeChannel(channel);
    };
  }, [user, calendarIds.join(',')]);

  return {
    bookings,
    loading,
    error,
    refetch: fetchBookings
  };
};
