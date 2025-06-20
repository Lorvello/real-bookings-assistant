
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCalendars } from '@/hooks/useCalendars';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, User, Building2 } from 'lucide-react';
import { CalendarDashboard } from '@/components/CalendarDashboard';
import { DashboardLayout } from '@/components/DashboardLayout';

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { calendars, loading: calendarsLoading } = useCalendars();

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading || profileLoading || calendarsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-8 h-8 bg-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg text-gray-300">Loading...</div>
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
      <div className="p-8 bg-gray-900 min-h-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}!
          </h1>
          <p className="text-gray-400">
            Manage your booking system and business settings
          </p>
        </div>

        <Tabs defaultValue="calendar" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800 border-gray-700">
            <TabsTrigger value="calendar" className="text-gray-300 data-[state=active]:bg-green-600 data-[state=active]:text-white">Calendar</TabsTrigger>
            <TabsTrigger value="profile" className="text-gray-300 data-[state=active]:bg-green-600 data-[state=active]:text-white">Profile</TabsTrigger>
            <TabsTrigger value="settings" className="text-gray-300 data-[state=active]:bg-green-600 data-[state=active]:text-white">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-6">
            <CalendarDashboard />
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-300">Email:</span>
                    <span className="text-gray-400">{user.email}</span>
                  </div>
                  {profile?.full_name && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-300">Full Name:</span>
                      <span className="text-gray-400">{profile.full_name}</span>
                    </div>
                  )}
                  {profile?.phone && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-300">Phone:</span>
                      <span className="text-gray-400">{profile.phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-300">Member since:</span>
                    <span className="text-gray-400">{new Date(user.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {profile?.business_name && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Building2 className="h-5 w-5" />
                    Business Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-300">Business Name:</span>
                      <span className="text-gray-400">{profile.business_name}</span>
                    </div>
                    {profile.business_type && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-300">Business Type:</span>
                        <Badge variant="outline" className="capitalize border-gray-600 text-gray-300">
                          {profile.business_type}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Calendar className="h-5 w-5" />
                  Your Calendars
                </CardTitle>
              </CardHeader>
              <CardContent>
                {calendars.length > 0 ? (
                  <div className="space-y-3">
                    {calendars.map((calendar) => (
                      <div key={calendar.id} className="flex justify-between items-center p-3 border border-gray-700 rounded-lg bg-gray-900">
                        <div>
                          <div className="font-medium text-white">{calendar.name}</div>
                          <div className="text-sm text-gray-400">
                            Booking URL: /{calendar.slug}
                          </div>
                          <div className="text-xs text-gray-500">
                            Timezone: {calendar.timezone}
                          </div>
                        </div>
                        <Badge variant={calendar.is_active ? "default" : "secondary"} className={calendar.is_active ? "bg-green-600" : ""}>
                          {calendar.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No calendars found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button onClick={() => navigate('/settings')} className="bg-green-600 hover:bg-green-700">
                    Settings
                  </Button>
                  <Button onClick={() => navigate('/conversations')} className="bg-green-600 hover:bg-green-700">
                    View Conversations
                  </Button>
                  <Button variant="outline" onClick={handleSignOut} className="border-gray-600 text-gray-300 hover:bg-gray-700">
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
