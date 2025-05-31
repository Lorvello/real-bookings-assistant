
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Settings, 
  MessageSquare, 
  ExternalLink,
  Download,
  Send,
  Pause,
  Play,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useAppointments } from '@/hooks/useAppointments';
import { useServices } from '@/hooks/useServices';
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';
import { useCalendarSync } from '@/hooks/useCalendarSync';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { CalendarIntegrationModal } from '@/components/CalendarIntegrationModal';
import { CalendarEventsDisplay } from '@/components/calendar/CalendarEventsDisplay';
import { CalendarManagementCard } from '@/components/dashboard/CalendarManagementCard';
import { TodaysScheduleCard } from '@/components/dashboard/TodaysScheduleCard';
import { SetupProgressCard } from '@/components/dashboard/SetupProgressCard';
import { BusinessMetricsCard } from '@/components/dashboard/BusinessMetricsCard';

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [emergencyPaused, setEmergencyPaused] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);

  const { profile, loading: profileLoading, refetch } = useProfile(user);
  const { appointments, refetch: refetchAppointments } = useAppointments(user);
  const { getPopularServices } = useServices(user);
  const { syncing, triggerSync } = useCalendarSync(user);

  // Set up real-time updates
  useRealTimeUpdates({
    user,
    onAppointmentUpdate: () => {
      console.log('[Profile] Real-time appointment update received');
      refetchAppointments();
    },
    onCalendarUpdate: () => {
      console.log('[Profile] Real-time calendar update received');
      refetchAppointments();
    },
    onSetupProgressUpdate: () => {
      console.log('[Profile] Real-time setup progress update received');
      refetch();
    }
  });

  useEffect(() => {
    if (!authLoading && !user) {
      console.log('[Profile] No user found, redirecting to login');
      navigate('/login');
      return;
    }
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleCalendarIntegrationComplete = async () => {
    setCalendarModalOpen(false);
    await triggerSync();
    setTimeout(() => {
      refetch();
      refetchAppointments();
    }, 1000);
  };

  const handleManualSync = async () => {
    await triggerSync(true);
    setTimeout(() => {
      refetch();
      refetchAppointments();
    }, 1000);
  };

  const handleExportData = () => {
    // Convert appointments to CSV format
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Date,Time,Client,Service,Status,Price\n"
      + appointments.map(apt => 
          `${apt.appointment_date},${apt.appointment_time},${apt.client_name},${apt.service_name},${apt.status},${apt.price || ''}`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `appointments_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBroadcastMessage = () => {
    // This would typically open a modal or navigate to a messaging interface
    console.log('Opening broadcast message interface...');
    // For now, just show an alert
    alert('Broadcast message feature coming soon!');
  };

  const handleEmergencyToggle = () => {
    setEmergencyPaused(!emergencyPaused);
    // Here you would typically update the booking system status in the backend
    console.log(`Booking system ${emergencyPaused ? 'resumed' : 'paused'}`);
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-8 h-8 bg-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg text-gray-600">Loading dashboard...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Generate booking trends from last 14 days
  const generateBookingTrends = () => {
    const trends = [];
    const today = new Date();
    
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayAppointments = appointments.filter(apt => apt.appointment_date === dateStr);
      trends.push({
        day: (14 - i).toString(),
        bookings: dayAppointments.length
      });
    }
    
    return trends;
  };

  const bookingTrends = generateBookingTrends();
  const popularServices = getPopularServices(appointments);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Dashboard
            </h1>
            <p className="text-gray-600">
              Welcome back, {profile?.full_name || user.email?.split('@')[0] || 'there'}
            </p>
          </div>
          <Button 
            onClick={handleManualSync}
            disabled={syncing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Calendar'}
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="xl:col-span-3 space-y-6">
            {/* Business Metrics */}
            <BusinessMetricsCard />

            {/* Today's Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Today's Schedule */}
              <TodaysScheduleCard />

              {/* Booking Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Booking Trends (14 days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ChartContainer config={{}}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={bookingTrends}>
                          <XAxis dataKey="day" axisLine={false} tickLine={false} />
                          <YAxis axisLine={false} tickLine={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line 
                            type="monotone" 
                            dataKey="bookings" 
                            stroke="#22C55E" 
                            strokeWidth={2}
                            dot={{ fill: '#22C55E', strokeWidth: 2, r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Calendar Events Display */}
            <CalendarEventsDisplay user={user} syncing={syncing} />

            {/* Calendar Management */}
            <CalendarManagementCard />

            {/* Setup Progress */}
            <SetupProgressCard onCalendarModalOpen={() => setCalendarModalOpen(true)} />
          </div>

          {/* Sidebar */}
          <div className="xl:col-span-1 space-y-6">
            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{profile?.full_name || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Business</p>
                  <p className="font-medium">{profile?.business_name || 'Not set'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Popular Services */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Popular Services</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {popularServices.length > 0 ? (
                  popularServices.map((service, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">{service.name}</span>
                        <span className="text-sm text-gray-500">{service.percentage}%</span>
                      </div>
                      <Progress value={service.percentage} className="h-2" />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No booking data available yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => navigate('/settings')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => navigate('/conversations')}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  View Conversations
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => window.open('https://calendar.google.com', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Calendar
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={handleExportData}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={handleBroadcastMessage}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Broadcast Message
                </Button>
                <Button 
                  className={`w-full justify-start ${emergencyPaused ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700'}`}
                  variant="outline"
                  onClick={handleEmergencyToggle}
                >
                  {emergencyPaused ? (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Resume Bookings
                    </>
                  ) : (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Emergency Pause
                    </>
                  )}
                </Button>
                <Button 
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" 
                  variant="outline"
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>
              </CardContent>
            </Card>

            {/* Trial Information */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-800">Free Trial</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-2">6 Days Left</div>
                  <p className="text-sm text-blue-700 mb-4">
                    Your 7-day free trial is active.
                  </p>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    Upgrade Plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <CalendarIntegrationModal
        open={calendarModalOpen}
        onOpenChange={setCalendarModalOpen}
        onComplete={handleCalendarIntegrationComplete}
      />
    </div>
  );
};

export default Profile;
