
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, User, Building2, Settings, MessageCircle, Clock, ArrowRight } from 'lucide-react';
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
      {/* Profile & Business Info Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Information Card */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-teal-500/15 to-cyan-500/20 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
          
          <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-teal-500/20 rounded-xl flex items-center justify-center">
                <User className="h-5 w-5 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100">Profile Information</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="font-medium text-slate-300">Email:</span>
                <span className="text-slate-400 text-sm">{user?.email}</span>
              </div>
              {profile?.full_name && (
                <div className="flex justify-between">
                  <span className="font-medium text-slate-300">Full Name:</span>
                  <span className="text-slate-400 text-sm">{profile.full_name}</span>
                </div>
              )}
              {profile?.phone && (
                <div className="flex justify-between">
                  <span className="font-medium text-slate-300">Phone:</span>
                  <span className="text-slate-400 text-sm">{profile.phone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-medium text-slate-300">Member since:</span>
                <span className="text-slate-400 text-sm">{user ? new Date(user.created_at).toLocaleDateString() : ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Business Information Card */}
        {profile?.business_name && (
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-teal-500/15 to-cyan-500/20 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
            
            <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-teal-500/20 rounded-xl flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-100">Business Information</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium text-slate-300">Business Name:</span>
                  <span className="text-slate-400 text-sm">{profile.business_name}</span>
                </div>
                {profile.business_type && (
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-300">Business Type:</span>
                    <Badge variant="outline" className="capitalize border-cyan-500/30 text-cyan-300 bg-cyan-500/10">
                      {profile.business_type}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Your Calendars */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-teal-500/15 to-cyan-500/20 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
        
        <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/10 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-teal-500/20 rounded-xl flex items-center justify-center">
              <Calendar className="h-5 w-5 text-cyan-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-100">Your Calendars</h3>
          </div>
          
          {calendars.length > 0 ? (
            <div className="space-y-4">
              {calendars.map((calendar) => (
                <div key={calendar.id} className="flex justify-between items-center p-4 border border-slate-700/50 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 transition-colors">
                  <div className="space-y-1">
                    <div className="font-medium text-slate-100">{calendar.name}</div>
                    <div className="text-sm text-slate-400">
                      Booking URL: /{calendar.slug}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      Timezone: {calendar.timezone}
                    </div>
                  </div>
                  <Badge 
                    variant={calendar.is_active ? "default" : "secondary"} 
                    className={calendar.is_active ? "bg-green-600 hover:bg-green-700" : "bg-slate-600"}
                  >
                    {calendar.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500">No calendars found</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-teal-500/15 to-cyan-500/20 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
        
        <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/10 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-teal-500/20 rounded-xl flex items-center justify-center">
              <Settings className="h-5 w-5 text-cyan-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-100">Quick Actions</h3>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button 
              onClick={() => navigate('/settings')} 
              className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white border-0 shadow-lg hover:shadow-cyan-500/25 transition-all duration-200 justify-start"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
              <ArrowRight className="h-3 w-3 ml-auto opacity-60" />
            </Button>
            <Button 
              onClick={() => navigate('/conversations')} 
              className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white border-0 shadow-lg hover:shadow-cyan-500/25 transition-all duration-200 justify-start"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Conversations
              <ArrowRight className="h-3 w-3 ml-auto opacity-60" />
            </Button>
            <Button 
              onClick={() => navigate('/availability')} 
              className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white border-0 shadow-lg hover:shadow-cyan-500/25 transition-all duration-200 justify-start"
            >
              <Clock className="h-4 w-4 mr-2" />
              Availability
              <ArrowRight className="h-3 w-3 ml-auto opacity-60" />
            </Button>
            <Button 
              variant="outline" 
              onClick={handleSignOut} 
              className="border-slate-600/50 text-slate-300 hover:bg-slate-700/50 hover:text-slate-200 hover:border-slate-500 justify-start"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
