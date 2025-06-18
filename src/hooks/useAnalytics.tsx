
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AnalyticsData {
  bookingsPerPeriod: {
    date: string;
    bookings: number;
    revenue: number;
  }[];
  serviceTypeStats: {
    name: string;
    count: number;
    revenue: number;
    color: string;
  }[];
  noShowRate: number;
  averageLeadTime: number;
  occupancyRate: number;
  totalRevenue: number;
  totalBookings: number;
  busyTimes: {
    hour: number;
    day: number;
    bookings: number;
  }[];
}

export const useAnalytics = (calendarId?: string, period: 'week' | 'month' | 'quarter' = 'month') => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAnalytics = async () => {
    if (!calendarId) return;

    try {
      setLoading(true);
      
      // Calculate date range based on period
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
      }

      // Fetch bookings data
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          service_types (
            name,
            price,
            color
          )
        `)
        .eq('calendar_id', calendarId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (bookingsError) throw bookingsError;

      // Process bookings per period
      const bookingsPerPeriod = processBookingsPerPeriod(bookings || [], period);
      
      // Process service type statistics
      const serviceTypeStats = processServiceTypeStats(bookings || []);
      
      // Calculate no-show rate
      const totalBookings = bookings?.length || 0;
      const noShows = bookings?.filter(b => b.status === 'no-show').length || 0;
      const noShowRate = totalBookings > 0 ? (noShows / totalBookings) * 100 : 0;
      
      // Calculate average lead time
      const averageLeadTime = calculateAverageLeadTime(bookings || []);
      
      // Calculate busy times heatmap data
      const busyTimes = calculateBusyTimes(bookings || []);
      
      // Calculate occupancy rate (this would need availability data to be accurate)
      const occupancyRate = calculateOccupancyRate(bookings || [], startDate, endDate);
      
      // Calculate total revenue
      const totalRevenue = bookings?.reduce((sum, booking) => {
        return sum + (booking.total_price || booking.service_types?.price || 0);
      }, 0) || 0;

      setAnalytics({
        bookingsPerPeriod,
        serviceTypeStats,
        noShowRate,
        averageLeadTime,
        occupancyRate,
        totalRevenue,
        totalBookings,
        busyTimes
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Fout bij laden analytics",
        description: "Kon analytics gegevens niet laden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processBookingsPerPeriod = (bookings: any[], period: string) => {
    const groupedBookings: { [key: string]: { bookings: number; revenue: number } } = {};
    
    bookings.forEach(booking => {
      const date = new Date(booking.start_time);
      let key: string;
      
      switch (period) {
        case 'week':
          key = date.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          break;
        case 'quarter':
          key = `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }
      
      if (!groupedBookings[key]) {
        groupedBookings[key] = { bookings: 0, revenue: 0 };
      }
      
      groupedBookings[key].bookings++;
      groupedBookings[key].revenue += booking.total_price || booking.service_types?.price || 0;
    });
    
    return Object.entries(groupedBookings).map(([date, data]) => ({
      date,
      bookings: data.bookings,
      revenue: data.revenue
    })).sort((a, b) => a.date.localeCompare(b.date));
  };

  const processServiceTypeStats = (bookings: any[]) => {
    const serviceStats: { [key: string]: { count: number; revenue: number; color: string } } = {};
    
    bookings.forEach(booking => {
      const serviceName = booking.service_types?.name || 'Onbekend';
      const price = booking.total_price || booking.service_types?.price || 0;
      const color = booking.service_types?.color || '#3B82F6';
      
      if (!serviceStats[serviceName]) {
        serviceStats[serviceName] = { count: 0, revenue: 0, color };
      }
      
      serviceStats[serviceName].count++;
      serviceStats[serviceName].revenue += price;
    });
    
    return Object.entries(serviceStats).map(([name, stats]) => ({
      name,
      count: stats.count,
      revenue: stats.revenue,
      color: stats.color
    }));
  };

  const calculateAverageLeadTime = (bookings: any[]) => {
    if (bookings.length === 0) return 0;
    
    const leadTimes = bookings.map(booking => {
      const bookingDate = new Date(booking.start_time);
      const createdDate = new Date(booking.created_at);
      return (bookingDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24); // days
    });
    
    return leadTimes.reduce((sum, time) => sum + time, 0) / leadTimes.length;
  };

  const calculateBusyTimes = (bookings: any[]) => {
    const busyMap: { [key: string]: number } = {};
    
    bookings.forEach(booking => {
      const date = new Date(booking.start_time);
      const hour = date.getHours();
      const day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const key = `${day}-${hour}`;
      
      busyMap[key] = (busyMap[key] || 0) + 1;
    });
    
    const result = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const key = `${day}-${hour}`;
        result.push({
          hour,
          day,
          bookings: busyMap[key] || 0
        });
      }
    }
    
    return result;
  };

  const calculateOccupancyRate = (bookings: any[], startDate: Date, endDate: Date) => {
    // Simplified calculation - would need more complex logic with actual availability data
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const workingHoursPerDay = 8; // Assume 8 working hours per day
    const totalAvailableSlots = totalDays * workingHoursPerDay * 2; // 30-min slots
    
    return totalAvailableSlots > 0 ? (bookings.length / totalAvailableSlots) * 100 : 0;
  };

  useEffect(() => {
    fetchAnalytics();
  }, [calendarId, period]);

  return {
    analytics,
    loading,
    refetch: fetchAnalytics
  };
};
