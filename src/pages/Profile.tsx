
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Circle, Calendar, Settings, User as UserIcon, Edit2 } from 'lucide-react';
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
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Please log in to access your profile</h1>
            <Button onClick={() => window.location.href = '/login'}>Go to Login</Button>
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
    },
    {
      id: 'availability_configured',
      title: 'Configure Availability',
      description: 'Set your working hours and availability preferences',
      completed: setupProgress?.availability_configured || false,
    },
    {
      id: 'booking_rules_set',
      title: 'Set Up Booking Rules',
      description: 'Define your booking policies and requirements',
      completed: setupProgress?.booking_rules_set || false,
    },
  ];

  const completedSteps = setupSteps.filter(step => step.completed).length;
  const totalSteps = setupSteps.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome to your AI Booking Assistant dashboard</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Account Information */}
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <UserIcon className="h-5 w-5" />
                    Account Information
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
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Email</Label>
                    <p className="text-gray-900">{user.email}</p>
                  </div>
                  
                  {isEditing ? (
                    <>
                      <div>
                        <Label htmlFor="full_name" className="text-sm font-medium text-gray-700">Full Name</Label>
                        <Input
                          id="full_name"
                          value={editForm.full_name}
                          onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="business_name" className="text-sm font-medium text-gray-700">Business Name</Label>
                        <Input
                          id="business_name"
                          value={editForm.business_name}
                          onChange={(e) => setEditForm({...editForm, business_name: e.target.value})}
                          className="mt-1"
                        />
                      </div>
                      <Button onClick={handleEditSave} className="bg-green-600 hover:bg-green-700">
                        Save Changes
                      </Button>
                    </>
                  ) : (
                    <>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Full Name</Label>
                        <p className="text-gray-900">{profile?.full_name || 'Not set'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Business Name</Label>
                        <p className="text-gray-900">{profile?.business_name || 'Not set'}</p>
                      </div>
                    </>
                  )}
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Account Status</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        7-Day Free Trial Active
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Member Since</Label>
                    <p className="text-gray-900">
                      {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Setup Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Account Setup Progress</CardTitle>
                <CardDescription>
                  Complete these steps to get the most out of your booking assistant ({completedSteps}/{totalSteps} completed)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {setupSteps.map((step) => (
                    <div key={step.id} className="flex items-start gap-3">
                      {step.completed ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <h4 className={`font-medium ${step.completed ? 'text-green-900' : 'text-gray-900'}`}>
                          {step.title}
                        </h4>
                        <p className="text-sm text-gray-600">{step.description}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleStepAction(step.id, step.completed)}
                      >
                        {step.completed ? 'Reset' : 'Start'}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Link Calendar
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Account Settings
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>
              </CardContent>
            </Card>

            {/* Trial Information */}
            <Card>
              <CardHeader>
                <CardTitle>Free Trial</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-2">6 Days Left</div>
                  <p className="text-sm text-gray-600 mb-4">
                    Your 7-day free trial is active. Upgrade to continue using all features.
                  </p>
                  <Button className="w-full bg-green-600 hover:bg-green-700">
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
