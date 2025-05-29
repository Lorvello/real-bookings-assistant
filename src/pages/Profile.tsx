
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  Circle, 
  Calendar, 
  Settings, 
  User as UserIcon, 
  Edit2, 
  Bot, 
  MessageSquare, 
  BarChart3, 
  AlertTriangle,
  Clock,
  Target,
  Users
} from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    business_name: ''
  });

  const { profile, setupProgress, loading: profileLoading, updateProfile, updateSetupProgress } = useProfile(user);

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

  useEffect(() => {
    if (profile) {
      setEditForm({
        full_name: profile.full_name || '',
        business_name: profile.business_name || ''
      });
    }
  }, [profile]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleEditSave = async () => {
    await updateProfile(editForm);
    setIsEditing(false);
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-600 rounded-full animate-pulse"></div>
            <div className="text-lg text-gray-600">Loading your dashboard...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Please log in to access your dashboard</h1>
            <Button onClick={() => window.location.href = '/login'} className="bg-green-600 hover:bg-green-700">
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
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

  // Mock data for dashboard features
  const botStats = {
    totalConversations: 47,
    thisWeek: 12,
    avgResponseTime: '2.3s',
    successRate: '94%'
  };

  const recentConversations = [
    { id: 1, user: 'John Smith', message: 'Can I book a meeting for next Tuesday?', time: '2 min ago', status: 'resolved' },
    { id: 2, user: 'Sarah Johnson', message: 'What are your available hours?', time: '15 min ago', status: 'active' },
    { id: 3, user: 'Mike Wilson', message: 'I need to reschedule my appointment', time: '1 hour ago', status: 'resolved' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      <div className="max-w-7xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Welcome back, {profile?.full_name || user.email?.split('@')[0] || 'there'}! 👋
              </h1>
              <p className="text-xl text-gray-600">
                {profile?.business_name ? `Managing ${profile.business_name}` : 'Your AI Booking Assistant Dashboard'}
              </p>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800 text-sm px-4 py-2">
              7-Day Free Trial Active
            </Badge>
          </div>
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
                <Badge variant="destructive" className="ml-4">
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
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Bot className="h-6 w-6" />
                  Your AI Assistant Performance
                </CardTitle>
                <CardDescription className="text-green-100">
                  Real-time insights into your booking assistant's activity
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-1">{botStats.totalConversations}</div>
                    <div className="text-sm text-gray-600">Total Conversations</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-1">{botStats.thisWeek}</div>
                    <div className="text-sm text-gray-600">This Week</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-1">{botStats.avgResponseTime}</div>
                    <div className="text-sm text-gray-600">Avg Response</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600 mb-1">{botStats.successRate}</div>
                    <div className="text-sm text-gray-600">Success Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Conversations */}
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  Recent Conversations
                </CardTitle>
                <CardDescription>Latest interactions with your booking assistant</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentConversations.map((conv) => (
                    <div key={conv.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {conv.user.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{conv.user}</div>
                          <div className="text-sm text-gray-600 truncate max-w-md">{conv.message}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">{conv.time}</div>
                        <Badge variant={conv.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {conv.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4">
                  View All Conversations
                </Button>
              </CardContent>
            </Card>

            {/* Setup Progress */}
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                    Setup Progress
                  </span>
                  <Badge variant="outline" className="text-sm">
                    {completedSteps}/{totalSteps} completed
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Complete these steps to unlock your booking assistant's full potential
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {setupSteps.map((step) => {
                    const IconComponent = step.icon;
                    return (
                      <div key={step.id} className={`flex items-center gap-4 p-4 rounded-lg border-2 ${
                        step.completed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                      }`}>
                        <div className={`p-2 rounded-full ${
                          step.completed ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {step.completed ? (
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          ) : (
                            <IconComponent className="h-6 w-6 text-red-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className={`font-semibold ${step.completed ? 'text-green-900' : 'text-red-900'}`}>
                            {step.title}
                          </h4>
                          <p className="text-sm text-gray-600">{step.description}</p>
                        </div>
                        <Button 
                          variant={step.completed ? "outline" : "default"}
                          size="sm"
                          className={step.completed ? "" : "bg-red-600 hover:bg-red-700"}
                          onClick={() => handleStepAction(step.id, step.completed)}
                        >
                          {step.completed ? 'Reset' : 'Complete Now'}
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
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-blue-600" />
                    Account
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    {isEditing ? 'Cancel' : 'Edit'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</Label>
                  <p className="text-sm font-medium text-gray-900">{user.email}</p>
                </div>
                
                {isEditing ? (
                  <>
                    <div>
                      <Label htmlFor="full_name" className="text-xs font-medium text-gray-500 uppercase tracking-wide">Full Name</Label>
                      <Input
                        id="full_name"
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                        className="mt-1"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="business_name" className="text-xs font-medium text-gray-500 uppercase tracking-wide">Business Name</Label>
                      <Input
                        id="business_name"
                        value={editForm.business_name}
                        onChange={(e) => setEditForm({...editForm, business_name: e.target.value})}
                        className="mt-1"
                        placeholder="Enter your business name"
                      />
                    </div>
                    <Button onClick={handleEditSave} className="w-full bg-green-600 hover:bg-green-700">
                      Save Changes
                    </Button>
                  </>
                ) : (
                  <>
                    <div>
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Full Name</Label>
                      <p className="text-sm font-medium text-gray-900">{profile?.full_name || 'Not set'}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Business Name</Label>
                      <p className="text-sm font-medium text-gray-900">{profile?.business_name || 'Not set'}</p>
                    </div>
                  </>
                )}
                
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Member Since</Label>
                  <p className="text-sm font-medium text-gray-900">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Recently joined'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start bg-blue-600 hover:bg-blue-700" variant="default">
                  <Calendar className="h-4 w-4 mr-2" />
                  Link Calendar
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  View Conversations
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
            <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardHeader>
                <CardTitle className="text-green-800">Free Trial</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">6 Days Left</div>
                  <p className="text-sm text-green-700 mb-4">
                    Your 7-day free trial is active. Upgrade to continue using all features.
                  </p>
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
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
