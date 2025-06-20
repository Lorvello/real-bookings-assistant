import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useCalendars } from '@/hooks/useCalendars';
import { useOptimizedBookings } from '@/hooks/useOptimizedBookings';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Euro, Users, MessageCircle, TrendingUp } from 'lucide-react';

interface DashboardStats {
  totalBookings: number;
  todayBookings: number;
  weekBookings: number;
  monthBookings: number;
  revenueToday: number;
  revenueMonth: number;
  newCustomers: number;
  repeatCustomers: number;
}

interface RecentBooking {
  id: string;
  customer_name: string;
  service_name?: string;
  start_time: string;
  status: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { calendars, loading: calendarsLoading } = useCalendars();
  const defaultCalendar = calendars.find(cal => cal.is_default) || calendars[0];
  const { bookings, loading: bookingsLoading } = useOptimizedBookings(defaultCalendar?.id);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<RecentBooking[]>([]);
  const [serviceStats, setServiceStats] = useState<any[]>([]);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (defaultCalendar?.id) {
      fetchDashboardData();
    }
  }, [defaultCalendar?.id]);

  const fetchDashboardData = async () => {
    if (!defaultCalendar?.id) return;

    try {
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Fetch booking stats
      const [todayResult, weekResult, monthResult, totalResult] = await Promise.all([
        supabase
          .from('bookings')
          .select('*')
          .eq('calendar_id', defaultCalendar.id)
          .gte('start_time', startOfToday.toISOString())
          .lt('start_time', endOfToday.toISOString())
          .neq('status', 'cancelled'),
        
        supabase
          .from('bookings')
          .select('*')
          .eq('calendar_id', defaultCalendar.id)
          .gte('start_time', startOfWeek.toISOString())
          .neq('status', 'cancelled'),
        
        supabase
          .from('bookings')
          .select('*')
          .eq('calendar_id', defaultCalendar.id)
          .gte('start_time', startOfMonth.toISOString())
          .neq('status', 'cancelled'),
        
        supabase
          .from('bookings')
          .select('*')
          .eq('calendar_id', defaultCalendar.id)
          .neq('status', 'cancelled')
      ]);

      // Calculate revenue
      const revenueToday = todayResult.data?.reduce((sum, booking) => sum + (booking.total_price || 0), 0) || 0;
      const revenueMonth = monthResult.data?.reduce((sum, booking) => sum + (booking.total_price || 0), 0) || 0;

      // Calculate unique customers
      const uniqueCustomersToday = new Set(todayResult.data?.map(b => b.customer_email)).size;
      const uniqueCustomersMonth = new Set(monthResult.data?.map(b => b.customer_email)).size;

      setStats({
        totalBookings: totalResult.data?.length || 0,
        todayBookings: todayResult.data?.length || 0,
        weekBookings: weekResult.data?.length || 0,
        monthBookings: monthResult.data?.length || 0,
        revenueToday,
        revenueMonth,
        newCustomers: uniqueCustomersToday,
        repeatCustomers: uniqueCustomersMonth - uniqueCustomersToday,
      });

      // Fetch recent bookings (last 5 completed)
      const { data: recentData } = await supabase
        .from('bookings')
        .select(`
          *,
          service_types!inner(name)
        `)
        .eq('calendar_id', defaultCalendar.id)
        .eq('status', 'completed')
        .order('start_time', { ascending: false })
        .limit(5);

      setRecentBookings(recentData?.map(booking => ({
        id: booking.id,
        customer_name: booking.customer_name,
        service_name: booking.service_types?.name,
        start_time: booking.start_time,
        status: booking.status
      })) || []);

      // Fetch upcoming bookings (next 5)
      const { data: upcomingData } = await supabase
        .from('bookings')
        .select(`
          *,
          service_types!inner(name)
        `)
        .eq('calendar_id', defaultCalendar.id)
        .in('status', ['pending', 'confirmed'])
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(5);

      setUpcomingBookings(upcomingData?.map(booking => ({
        id: booking.id,
        customer_name: booking.customer_name,
        service_name: booking.service_types?.name,
        start_time: booking.start_time,
        status: booking.status
      })) || []);

      // Fetch service type statistics
      const { data: serviceData } = await supabase
        .from('bookings')
        .select(`
          service_type_id,
          service_types!inner(name)
        `)
        .eq('calendar_id', defaultCalendar.id)
        .neq('status', 'cancelled')
        .gte('start_time', startOfMonth.toISOString());

      // Count bookings per service type
      const serviceCounts = serviceData?.reduce((acc, booking) => {
        const serviceName = booking.service_types?.name || 'Onbekend';
        acc[serviceName] = (acc[serviceName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const totalServices = Object.values(serviceCounts).reduce((sum, count) => sum + count, 0);
      const serviceStatsArray = Object.entries(serviceCounts)
        .map(([name, count]) => ({
          name,
          count,
          percentage: totalServices > 0 ? Math.round((count / totalServices) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setServiceStats(serviceStatsArray);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-600/20 text-green-400';
      case 'confirmed':
        return 'bg-blue-600/20 text-blue-400';
      case 'pending':
        return 'bg-yellow-600/20 text-yellow-400';
      default:
        return 'bg-gray-600/20 text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Voltooid';
      case 'confirmed':
        return 'Bevestigd';
      case 'pending':
        return 'In afwachting';
      default:
        return status;
    }
  };

  if (authLoading || calendarsLoading || bookingsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-8 h-8 bg-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg text-gray-300">Dashboard laden...</div>
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
      <div className="min-h-screen bg-gray-900 p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Welkom terug, hier is je overzicht</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Bookings Vandaag */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Bookings Vandaag</p>
                  <p className="text-3xl font-bold text-white mt-2">{stats?.todayBookings || 0}</p>
                  <p className="text-sm text-green-400 mt-1">Vandaag</p>
                </div>
                <div className="bg-green-600/20 p-3 rounded-lg">
                  <Calendar className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Omzet Deze Maand */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Omzet Deze Maand</p>
                  <p className="text-3xl font-bold text-white mt-2">€{stats?.revenueMonth || 0}</p>
                  <p className="text-sm text-blue-400 mt-1">Deze maand</p>
                </div>
                <div className="bg-blue-600/20 p-3 rounded-lg">
                  <Euro className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nieuwe Klanten */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Nieuwe Klanten</p>
                  <p className="text-3xl font-bold text-white mt-2">{stats?.newCustomers || 0}</p>
                  <p className="text-sm text-gray-400 mt-1">Vandaag</p>
                </div>
                <div className="bg-purple-600/20 p-3 rounded-lg">
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Totaal Bookings */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Totaal Bookings</p>
                  <p className="text-3xl font-bold text-white mt-2">{stats?.totalBookings || 0}</p>
                  <p className="text-sm text-green-400 mt-1">Alle tijd</p>
                </div>
                <div className="bg-green-600/20 p-3 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Bookings Overview */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Bookings Overzicht</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Deze week</span>
                  <span className="text-white font-medium">{stats?.weekBookings || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Deze maand</span>
                  <span className="text-white font-medium">{stats?.monthBookings || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Omzet vandaag</span>
                  <span className="text-white font-medium">€{stats?.revenueToday || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Types Distribution */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Populaire Services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {serviceStats.length > 0 ? (
                  serviceStats.map((service, index) => (
                    <div key={service.name} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-3 ${
                          index === 0 ? 'bg-green-600' : 
                          index === 1 ? 'bg-blue-600' : 
                          index === 2 ? 'bg-purple-600' : 
                          index === 3 ? 'bg-yellow-600' : 'bg-gray-600'
                        }`}></div>
                        <span className="text-gray-300">{service.name}</span>
                      </div>
                      <span className="text-white font-medium">{service.percentage}%</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center">Geen service data beschikbaar</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent & Upcoming Bookings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Bookings */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Recente Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentBookings.length > 0 ? (
                  recentBookings.map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{booking.customer_name}</p>
                        <p className="text-sm text-gray-400">
                          {booking.service_name} - {new Date(booking.start_time).toLocaleTimeString('nl-NL', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                      <Badge className={getStatusColor(booking.status)}>
                        {getStatusText(booking.status)}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">Geen recente bookings</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Bookings */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Aankomende Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingBookings.length > 0 ? (
                  upcomingBookings.map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{booking.customer_name}</p>
                        <p className="text-sm text-gray-400">
                          {booking.service_name} - {new Date(booking.start_time).toLocaleDateString('nl-NL')} {new Date(booking.start_time).toLocaleTimeString('nl-NL', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                      <Badge className={getStatusColor(booking.status)}>
                        {getStatusText(booking.status)}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">Geen aankomende bookings</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
