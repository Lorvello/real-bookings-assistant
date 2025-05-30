import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  Calendar, 
  Settings, 
  Bot, 
  MessageSquare, 
  BarChart3, 
  AlertTriangle,
  Clock,
  Target,
  Users,
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
import { useBusinessMetrics } from '@/hooks/useBusinessMetrics';
import { useConversations } from '@/hooks/useConversations';
import { useServices } from '@/hooks/useServices';
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';
import { useCalendarSync } from '@/hooks/useCalendarSync';
import { useCalendarLinking } from '@/hooks/useCalendarLinking';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { CalendarIntegrationModal } from '@/components/CalendarIntegrationModal';
import { CalendarEventsDisplay } from '@/components/calendar/CalendarEventsDisplay';

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [emergencyPaused, setEmergencyPaused] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);

  const { profile, setupProgress, loading: profileLoading, updateSetupProgress, refetch } = useProfile(user);
  const { appointments, getTodaysAppointments, refetch: refetchAppointments } = useAppointments(user);
  const { aggregatedMetrics, loading: metricsLoading, refetch: refetchMetrics } = useBusinessMetrics(user);
  const { conversations, refetch: refetchConversations } = useConversations(user);
  const { services, getPopularServices, refetch: refetchServices } = useServices(user);
  const { syncing, triggerSync } = useCalendarSync(user);
  
  // Simplified calendar linking hook
  const { 
    isConnected: calendarConnected, 
    loading: calendarLoading,
    refetchConnection 
  } = useCalendarLinking(user);

  // Set up real-time updates
  useRealTimeUpdates({
    user,
    onAppointmentUpdate: () => {
      console.log('[Profile] Real-time appointment update received');
      refetchAppointments();
      refetchMetrics();
    },
    onConversationUpdate: () => {
      console.log('[Profile] Real-time conversation update received');
      refetchConversations();
    },
    onCalendarUpdate: () => {
      console.log('[Profile] Real-time calendar update received');
      refetchAppointments();
      refetchConnection();
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

  const handleStepAction = async (step: string, completed: boolean) => {
    switch (step) {
      case 'calendar_linked':
        if (!completed) {
          // Redirect to login with Google + Calendar scopes
          window.location.href = '/login?provider=google&scope=calendar';
        } else {
          await updateSetupProgress('calendar_linked', false);
        }
        break;
      case 'availability_configured':
        await updateSetupProgress('availability_configured', !completed);
        break;
      case 'booking_rules_set':
        await updateSetupProgress('booking_rules_set', !completed);
        break;
    }
  };

  const handleCalendarIntegrationComplete = async () => {
    await updateSetupProgress('calendar_linked', true);
    await triggerSync();
  };

  const handleManualSync = async () => {
    await triggerSync(true);
    setTimeout(() => {
      refetch();
      refetchAppointments();
    }, 1000);
  };

  if (authLoading || profileLoading || calendarLoading) {
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

  const setupSteps = [
    {
      id: 'calendar_linked',
      title: 'Link Your Calendar',
      description: 'Connect your calendar to start receiving bookings',
      completed: calendarConnected || setupProgress?.calendar_linked || false,
      icon: Calendar,
    },
    {
      id: 'availability_configured',
      title: 'Configure Availability',
      description: 'Set your working hours and availability preferences',
      completed: setupProgress?.availability_configured || false,
      icon: Clock,
    },
    {
      id: 'booking_rules_set',
      title: 'Set Up Booking Rules',
      description: 'Define your booking policies and requirements',
      completed: setupProgress?.booking_rules_set || false,
      icon: Target,
    },
  ];

  const completedSteps = setupSteps.filter(step => step.completed).length;
  const totalSteps = setupSteps.length;
  const incompleteSteps = setupSteps.filter(step => !step.completed);

  // Real metrics data
  const metrics = [
    { label: 'Total Clients', value: aggregatedMetrics.totalClients.toString(), icon: Users },
    { label: 'New This Week', value: aggregatedMetrics.newThisWeek.toString(), icon: TrendingUp },
    { label: 'Avg Response', value: aggregatedMetrics.avgResponse, icon: MessageSquare },
    { label: 'Success Rate', value: aggregatedMetrics.successRate, icon: CheckCircle },
    { label: 'This Month', value: aggregatedMetrics.thisMonth.toString(), icon: Calendar },
  ];

  // Today's appointments from real data
  const todaysAppointments = getTodaysAppointments();
  const todaySchedule = todaysAppointments.map(apt => ({
    time: apt.appointment_time.slice(0, 5),
    client: apt.client_name,
    service: apt.service_name
  }));

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

  // Show loading state for metrics
  if (metricsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto py-8 px-4">
          <div className="text-center py-20">
            <div className="w-8 h-8 bg-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg text-gray-600">Loading dashboard data...</div>
          </div>
        </div>
      </div>
    );
  }

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

        {/* Action Required Section */}
        {incompleteSteps.length > 0 && (
          <Alert className="mb-8 border-red-200 bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-lg">Action Required</span>
                  <p className="mt-1">Complete {incompleteSteps.length} more setup steps to activate your booking assistant.</p>
                </div>
                <Badge variant="destructive">
                  {incompleteSteps.length} pending
                </Badge>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="xl:col-span-3 space-y-6">
            {/* Real Business Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  Business Metrics
                </CardTitle>
                <CardDescription>
                  Key performance indicators for your booking business
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                  {metrics.map((metric, index) => {
                    const IconComponent = metric.icon;
                    return (
                      <div key={index} className="text-center">
                        <div className="flex justify-center mb-2">
                          <IconComponent className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</div>
                        <div className="text-sm text-gray-600">{metric.label}</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Today's Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Today's Real Schedule */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-green-600" />
                    Today's Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {todaySchedule.length > 0 ? (
                      <>
                        {todaySchedule.map((appointment, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <div className="font-medium text-gray-900">{appointment.time}</div>
                              <div className="text-sm text-gray-600">{appointment.client}</div>
                            </div>
                            <div className="text-sm text-gray-700 text-right">
                              {appointment.service}
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No appointments scheduled for today
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Real Booking Trends */}
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

            {/* Setup Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-3">
                    <Bot className="h-5 w-5 text-green-600" />
                    Setup Progress
                  </span>
                  <Badge variant="outline">
                    {completedSteps}/{totalSteps} completed
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Complete these steps to activate your booking assistant
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {setupSteps.map((step) => {
                    const IconComponent = step.icon;
                    return (
                      <div key={step.id} className={`flex items-center gap-4 p-4 rounded-lg border ${
                        step.completed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                      }`}>
                        <div className={`p-2 rounded-full ${
                          step.completed ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {step.completed ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <IconComponent className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className={`font-medium ${step.completed ? 'text-green-900' : 'text-red-900'}`}>
                            {step.title}
                          </h4>
                          <p className="text-sm text-gray-600">{step.description}</p>
                        </div>
                        <Button 
                          variant={step.completed ? "outline" : "default"}
                          size="sm"
                          className={step.completed ? "" : "bg-red-600 hover:bg-red-700 text-white"}
                          onClick={() => handleStepAction(step.id, step.completed)}
                        >
                          {step.completed ? 'Reset' : 'Complete'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
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

            {/* Real Popular Services */}
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

            {/* Expanded Quick Actions */}
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
                  <Calendar className="h-4 w-4 mr-2" />
                  Calendar
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => console.log('Export data functionality')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => console.log('Broadcast message functionality')}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Broadcast Message
                </Button>
                <Button 
                  className={`w-full justify-start ${emergencyPaused ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700'}`}
                  variant="outline"
                  onClick={() => setEmergencyPaused(!emergencyPaused)}
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
