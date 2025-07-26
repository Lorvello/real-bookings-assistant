
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
    user_id: string;
    users?: {
      full_name: string;
    };
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
            color,
            user_id,
            users (
              full_name
            )
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

  // OPTIMIZED: Single effect with debounced fetching to prevent double loading
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchBookings();
    }, 50); // Small delay to batch rapid changes

    return () => clearTimeout(timeoutId);
  }, [user?.id, calendarIds.join(',')]);

  // OPTIMIZED: Simplified real-time subscription with immediate updates
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
          const newCalendarId = payload.new && typeof payload.new === 'object' && 'calendar_id' in payload.new 
            ? (payload.new as any).calendar_id : null;
          const oldCalendarId = payload.old && typeof payload.old === 'object' && 'calendar_id' in payload.old 
            ? (payload.old as any).calendar_id : null;
          
          if ((newCalendarId && calendarIds.includes(newCalendarId)) || 
              (oldCalendarId && calendarIds.includes(oldCalendarId))) {
            // Immediate fetch without delays for real-time updates
            fetchBookings();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [calendarIds.join(',')]);  // Removed user dependency to reduce subscription churn

  return {
    bookings,
    loading,
    error,
    refetch: fetchBookings
  };
};
