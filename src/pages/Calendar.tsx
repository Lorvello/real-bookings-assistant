
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import BookingCalendarDashboard from '@/components/ui/BookingCalendarDashboard';
import { useAuth } from '@/hooks/useAuth';
import { useCalendars } from '@/hooks/useCalendars';
import { supabase } from '@/integrations/supabase/client';

interface CalendarData {
  day: Date;
  bookings: Array<{
    id: number;
    customerName: string;
    service: string;
    time: string;
    datetime: string;
    phone: string;
    email: string;
    status: "confirmed" | "pending" | "cancelled";
  }>;
}

interface BookingWithService {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  start_time: string;
  status: string;
  service_types?: {
    name: string;
    color: string;
  };
}

const Calendar = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { calendars, loading: calendarsLoading } = useCalendars();
  const [calendarData, setCalendarData] = useState<CalendarData[]>([]);
  const [loading, setLoading] = useState(true);

  const defaultCalendar = calendars.find(cal => cal.is_default) || calendars[0];

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (defaultCalendar?.id) {
      fetchBookings();
      
      // Real-time subscription
      const subscription = supabase
        .channel('bookings_channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookings',
            filter: `calendar_id=eq.${defaultCalendar.id}`,
          },
          (payload) => {
            console.log('Booking update:', payload);
            fetchBookings();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [defaultCalendar?.id]);

  const fetchBookings = async () => {
    if (!defaultCalendar?.id) return;
    
    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          *,
          service_types!inner(name, color)
        `)
        .eq('calendar_id', defaultCalendar.id)
        .in('status', ['confirmed', 'pending'])
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Transform data voor de calendar component
      const transformedData = transformBookingsToCalendarFormat(bookings || []);
      setCalendarData(transformedData);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const transformBookingsToCalendarFormat = (bookings: BookingWithService[]): CalendarData[] => {
    // Group bookings by day
    const grouped = bookings.reduce((acc: Record<string, any[]>, booking) => {
      const date = new Date(booking.start_time).toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push({
        id: parseInt(booking.id),
        customerName: booking.customer_name,
        service: booking.service_types?.name || 'Service',
        time: new Date(booking.start_time).toLocaleTimeString('nl-NL', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        datetime: booking.start_time,
        phone: booking.customer_phone || '',
        email: booking.customer_email,
        status: booking.status as "confirmed" | "pending" | "cancelled"
      });
      return acc;
    }, {});

    // Convert to array format
    return Object.entries(grouped).map(([date, bookings]) => ({
      day: new Date(date),
      bookings
    }));
  };

  if (authLoading || calendarsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-8 h-8 bg-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg text-gray-300">Kalender laden...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="h-full bg-gray-900">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 bg-green-600 rounded-full animate-spin mx-auto mb-4"></div>
              <div className="text-lg text-gray-300">Kalender wordt geladen...</div>
            </div>
          </div>
        ) : (
          <BookingCalendarDashboard data={calendarData} />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Calendar;
