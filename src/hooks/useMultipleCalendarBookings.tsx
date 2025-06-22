
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
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

      console.log('🔄 Fetching bookings for calendars:', calendarIds);

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

      console.log('📅 Loaded bookings:', transformedBookings.length);
      setBookings(transformedBookings);
    } catch (err) {
      console.error('Error in fetchBookings:', err);
      setError('Er is een onverwachte fout opgetreden');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchBookings();
  }, [user, calendarIds.join(',')]);

  // Real-time subscription met verbeterde handling
  useEffect(() => {
    if (!user || !calendarIds.length) return;

    const channelName = `bookings_multiple_${calendarIds.sort().join('_')}`;
    console.log('🔄 Setting up realtime subscription for calendars:', calendarIds);
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          console.log('📱 Real-time booking update received:', payload);
          
          // Check if this change affects our calendars
          const newCalendarId = payload.new && typeof payload.new === 'object' && 'calendar_id' in payload.new 
            ? (payload.new as any).calendar_id 
            : null;
          const oldCalendarId = payload.old && typeof payload.old === 'object' && 'calendar_id' in payload.old 
            ? (payload.old as any).calendar_id 
            : null;
          
          if ((newCalendarId && calendarIds.includes(newCalendarId)) || 
              (oldCalendarId && calendarIds.includes(oldCalendarId))) {
            console.log('🔄 Real-time update affects our calendars, refreshing...');
            
            // Invalidate queries first
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            queryClient.invalidateQueries({ queryKey: ['multiple-calendar-bookings'] });
            
            // Then fetch fresh data
            setTimeout(() => {
              fetchBookings();
            }, 100);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });

    return () => {
      console.log('🔌 Cleaning up subscription for:', channelName);
      supabase.removeChannel(channel);
    };
  }, [user, calendarIds.join(','), queryClient]);

  return {
    bookings,
    loading,
    error,
    refetch: fetchBookings
  };
};
