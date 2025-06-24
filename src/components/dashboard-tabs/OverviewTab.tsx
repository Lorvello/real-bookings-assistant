
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, User, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCalendars } from '@/hooks/useCalendars';

interface OverviewTabProps {
  calendarId: string;
}

export function OverviewTab({ calendarId }: OverviewTabProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { calendars } = useCalendars();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}!
        </h2>
        <p className="text-gray-400">
          Overview of your booking system and business settings
        </p>
      </div>

      {/* Profile Information */}
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
              <span className="text-gray-400">{user?.email}</span>
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
              <span className="text-gray-400">{user ? new Date(user.created_at).toLocaleDateString() : ''}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Information */}
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

      {/* Your Calendars */}
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

      {/* Quick Actions */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <Button onClick={() => navigate('/settings')} className="bg-green-600 hover:bg-green-700">
              Settings
            </Button>
            <Button onClick={() => navigate('/conversations')} className="bg-green-600 hover:bg-green-700">
              View Conversations
            </Button>
            <Button onClick={() => navigate('/availability')} className="bg-green-600 hover:bg-green-700">
              Manage Availability
            </Button>
            <Button variant="outline" onClick={handleSignOut} className="border-gray-600 text-gray-300 hover:bg-gray-700">
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
