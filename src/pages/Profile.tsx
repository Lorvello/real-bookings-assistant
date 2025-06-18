
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCalendars } from '@/hooks/useCalendars';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Building2 } from 'lucide-react';

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
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-8 h-8 bg-green-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg text-gray-600">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}!
          </h1>
          <p className="text-gray-600">
            Manage your booking system and business settings
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium">Email:</span>
                  <span>{user.email}</span>
                </div>
                {profile?.full_name && (
                  <div className="flex justify-between">
                    <span className="font-medium">Full Name:</span>
                    <span>{profile.full_name}</span>
                  </div>
                )}
                {profile?.phone && (
                  <div className="flex justify-between">
                    <span className="font-medium">Phone:</span>
                    <span>{profile.phone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-medium">Member since:</span>
                  <span>{new Date(user.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {profile?.business_name && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Business Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium">Business Name:</span>
                    <span>{profile.business_name}</span>
                  </div>
                  {profile.business_type && (
                    <div className="flex justify-between">
                      <span className="font-medium">Business Type:</span>
                      <Badge variant="outline" className="capitalize">
                        {profile.business_type}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Your Calendars
              </CardTitle>
            </CardHeader>
            <CardContent>
              {calendars.length > 0 ? (
                <div className="space-y-3">
                  {calendars.map((calendar) => (
                    <div key={calendar.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{calendar.name}</div>
                        <div className="text-sm text-gray-500">
                          Booking URL: /{calendar.slug}
                        </div>
                        <div className="text-xs text-gray-400">
                          Timezone: {calendar.timezone}
                        </div>
                      </div>
                      <Badge variant={calendar.is_active ? "default" : "secondary"}>
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

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button onClick={() => navigate('/settings')}>
                  Settings
                </Button>
                <Button onClick={() => navigate('/conversations')}>
                  View Conversations
                </Button>
                <Button variant="outline" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
