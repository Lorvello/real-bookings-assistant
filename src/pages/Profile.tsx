
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
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
  TrendingUp
} from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate } from 'react-router-dom';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [emergencyPaused, setEmergencyPaused] = useState(false);

  const { profile, setupProgress, loading: profileLoading, updateSetupProgress } = useProfile(user);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleStepAction = async (step: string, completed: boolean) => {
    switch (step) {
      case 'calendar_linked':
        await updateSetupProgress('calendar_linked', !completed);
        break;
      case 'availability_configured':
        await updateSetupProgress('availability_configured', !completed);
        break;
      case 'booking_rules_set':
        await updateSetupProgress('booking_rules_set', !completed);
        break;
    }
  };

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-lg text-gray-600">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  const setupSteps = [
    {
      id: 'calendar_linked',
      title: 'Link Your Calendar',
      description: 'Connect your calendar to start receiving bookings',
      completed: setupProgress?.calendar_linked || false,
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

  // Enhanced metrics data
  const metrics = [
    { label: 'Total Clients', value: '47', icon: Users },
    { label: 'New This Week', value: '12', icon: TrendingUp },
    { label: 'Avg Response', value: '2.3s', icon: MessageSquare },
    { label: 'Success Rate', value: '94%', icon: CheckCircle },
    { label: 'This Month', value: '156', icon: Calendar },
  ];

  // Today's schedule data
  const todaySchedule = [
    { time: '09:00', client: 'Sarah Johnson', service: 'Hair Cut & Style' },
    { time: '11:30', client: 'Mike Wilson', service: 'Beard Trim' },
    { time: '14:00', client: 'Emma Davis', service: 'Hair Color' },
    { time: '16:30', client: 'John Smith', service: 'Consultation' },
  ];

  // Booking trends data (last 14 days)
  const bookingTrends = [
    { day: '1', bookings: 8 },
    { day: '2', bookings: 12 },
    { day: '3', bookings: 6 },
    { day: '4', bookings: 15 },
    { day: '5', bookings: 9 },
    { day: '6', bookings: 18 },
    { day: '7', bookings: 11 },
    { day: '8', bookings: 14 },
    { day: '9', bookings: 7 },
    { day: '10', bookings: 16 },
    { day: '11', bookings: 13 },
    { day: '12', bookings: 10 },
    { day: '13', bookings: 19 },
    { day: '14', bookings: 12 },
  ];

  // Popular services data
  const popularServices = [
    { name: 'Hair Cut', percentage: 45 },
    { name: 'Hair Color', percentage: 32 },
    { name: 'Styling', percentage: 23 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard
          </h1>
          <p className="text-gray-600">
            Welcome back, {profile?.full_name || user.email?.split('@')[0] || 'there'}
          </p>
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
            {/* Enhanced Metrics */}
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
              {/* Today's Schedule */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-green-600" />
                    Today's Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
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
                    <div className="text-center pt-2 text-sm text-green-600 font-medium">
                      3 slots remaining today
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Booking Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Booking Trends
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
                  <div className="text-center pt-2 text-sm text-gray-600">
                    Peak hours: 10-12am, 2-4pm
                  </div>
                </CardContent>
              </Card>
            </div>

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

            {/* Popular Services */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Popular Services</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {popularServices.map((service, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">{service.name}</span>
                      <span className="text-sm text-gray-500">{service.percentage}%</span>
                    </div>
                    <Progress value={service.percentage} className="h-2" />
                  </div>
                ))}
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
    </div>
  );
};

export default Profile;
