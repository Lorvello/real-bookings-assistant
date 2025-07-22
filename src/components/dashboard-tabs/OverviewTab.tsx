
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Star, TrendingUp, AlertTriangle, User, Building2, Crown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCalendars } from '@/hooks/useCalendars';
import { useNextAppointment } from '@/hooks/useNextAppointment';
import { usePopularService } from '@/hooks/usePopularService';
import { useWeeklyInsights } from '@/hooks/useWeeklyInsights';
import { useCapacityAlerts } from '@/hooks/useCapacityAlerts';

interface OverviewTabProps {
  calendarId: string;
  calendarIds?: string[];
}

const formatSubscriptionTier = (tier?: string) => {
  if (!tier) return null;
  
  switch (tier) {
    case 'starter':
      return 'Starter Plan';
    case 'professional':
      return 'Professional Plan';
    case 'enterprise':
      return 'Enterprise Plan';
    default:
      return null;
  }
};

const getTierColor = (tier?: string) => {
  switch (tier) {
    case 'starter':
      return 'text-slate-400';
    case 'professional':
      return 'text-blue-400';
    case 'enterprise':
      return 'text-yellow-400';
    default:
      return 'text-slate-400';
  }
};

export function OverviewTab({ calendarId, calendarIds }: OverviewTabProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { calendars } = useCalendars();
  
  // Use calendarIds if provided, otherwise fallback to single calendarId
  const activeCalendarIds = calendarIds && calendarIds.length > 0 ? calendarIds : [calendarId];
  
  const { data: nextAppointment } = useNextAppointment(activeCalendarIds);
  const { data: popularService } = usePopularService(activeCalendarIds);
  const { data: weeklyInsights } = useWeeklyInsights(activeCalendarIds[0]); // Keep single for now
  const { data: capacityAlerts } = useCapacityAlerts(activeCalendarIds);

  const formatTimeUntilAppointment = (startTime: string) => {
    const now = new Date();
    const appointment = new Date(startTime);
    const diff = appointment.getTime() - now.getTime();
    
    if (diff < 0) return 'Starting soon';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  };

  const tierDisplay = formatSubscriptionTier(profile?.subscription_tier);
  const hasActiveSubscription = profile?.subscription_status === 'active';

  return (
    <div className="space-y-6">
      {/* Main Dashboard Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Next Appointment */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-teal-500/15 to-cyan-500/20 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
          
          <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-teal-500/20 rounded-xl flex items-center justify-center">
                <Clock className="h-5 w-5 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100">Next Appointment</h3>
            </div>
            
            {nextAppointment ? (
              <div className="space-y-3">
                <div className="text-2xl font-bold text-slate-100">
                  {new Date(nextAppointment.start_time).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
                <div className="text-slate-300">{nextAppointment.customer_name}</div>
                <div className="text-sm text-slate-400">
                  {nextAppointment.service_name || nextAppointment.service_types?.name || 'Service'}
                </div>
                <div className="text-xs text-cyan-400 font-medium">
                  In {formatTimeUntilAppointment(nextAppointment.start_time)}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-slate-500 text-sm">No appointments today</div>
              </div>
            )}
          </div>
        </div>

        {/* Popular Service */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-teal-500/15 to-cyan-500/20 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
          
          <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-teal-500/20 rounded-xl flex items-center justify-center">
                <Star className="h-5 w-5 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100">Popular Service</h3>
            </div>
            
            {popularService ? (
              <div className="space-y-3">
                <div className="text-lg font-semibold text-slate-100">
                  {popularService.name}
                </div>
                <div className="text-sm text-slate-400">
                  {popularService.count} bookings this week
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-xs text-green-400">Most booked</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-slate-500 text-sm">No bookings this week</div>
              </div>
            )}
          </div>
        </div>

        {/* Weekly Insights */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-teal-500/15 to-cyan-500/20 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
          
          <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-teal-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100">Weekly Insights</h3>
            </div>
            
            {weeklyInsights ? (
              <div className="space-y-3">
                {weeklyInsights.busiestDay && (
                  <div>
                    <div className="text-sm text-slate-400">Busiest Day</div>
                    <div className="text-lg font-semibold text-slate-100">
                      {weeklyInsights.busiestDay}
                    </div>
                    <div className="text-xs text-slate-500">
                      {weeklyInsights.busiestDayCount} bookings
                    </div>
                  </div>
                )}
                {weeklyInsights.mostActiveHours && (
                  <div>
                    <div className="text-sm text-slate-400">Most Active Hours</div>
                    <div className="text-lg font-semibold text-slate-100">
                      {weeklyInsights.mostActiveHours}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-slate-500 text-sm">No data this week</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Capacity Alerts */}
      {capacityAlerts && capacityAlerts.length > 0 && (
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/20 via-yellow-500/15 to-orange-500/20 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
          
          <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-orange-500/30 rounded-2xl shadow-2xl shadow-orange-500/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100">Capacity Alerts</h3>
            </div>
            
            <div className="space-y-3">
              {capacityAlerts.map((alert, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <div>
                    <div className="font-medium text-slate-100">
                      {alert.date.toLocaleDateString([], { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="text-sm text-slate-400">{alert.message}</div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={
                      alert.type === 'fully-booked' 
                        ? "border-red-500/30 text-red-300 bg-red-500/10"
                        : "border-orange-500/30 text-orange-300 bg-orange-500/10"
                    }
                  >
                    {alert.type === 'fully-booked' ? 'Full' : 'Near Full'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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

      {/* Compact Profile Info */}
      {(user?.email || profile?.business_name || (hasActiveSubscription && tierDisplay)) && (
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-slate-600/10 via-slate-500/5 to-slate-600/10 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
          
          <div className="relative bg-gradient-to-br from-slate-800/50 via-slate-900/40 to-slate-800/50 backdrop-blur-2xl border border-slate-600/30 rounded-2xl shadow-2xl shadow-slate-600/5 p-4">
            <div className="flex items-center gap-4 text-sm flex-wrap">
              {user?.email && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-400">{user.email}</span>
                </div>
              )}
              {profile?.business_name && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-400">{profile.business_name}</span>
                </div>
              )}
              {hasActiveSubscription && tierDisplay && (
                <div className="flex items-center gap-2">
                  <Crown className={`h-4 w-4 ${getTierColor(profile?.subscription_tier)}`} />
                  <span className={getTierColor(profile?.subscription_tier)}>{tierDisplay}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
