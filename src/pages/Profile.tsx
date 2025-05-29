
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  ExternalLink
} from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

  // Mock data for dashboard
  const botStats = {
    totalConversations: 47,
    thisWeek: 12,
    avgResponseTime: '2.3s',
    successRate: '94%'
  };

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
            {/* Bot Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Bot className="h-5 w-5 text-blue-600" />
                  AI Assistant Performance
                </CardTitle>
                <CardDescription>
                  Real-time insights into your booking assistant's activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-1">{botStats.totalConversations}</div>
                    <div className="text-sm text-gray-600">Total Conversations</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-1">{botStats.thisWeek}</div>
                    <div className="text-sm text-gray-600">This Week</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-1">{botStats.avgResponseTime}</div>
                    <div className="text-sm text-gray-600">Avg Response</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-1">{botStats.successRate}</div>
                    <div className="text-sm text-gray-600">Success Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Setup Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
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
                  <Calendar className="h-4 w-4 mr-2" />
                  Calendar
                  <ExternalLink className="h-3 w-3 ml-auto" />
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
