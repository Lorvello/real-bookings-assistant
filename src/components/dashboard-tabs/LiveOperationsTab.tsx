
import React from 'react';
import { useOptimizedLiveOperations } from '@/hooks/dashboard/useOptimizedLiveOperations';
import { useRealtimeSubscription } from '@/hooks/dashboard/useRealtimeSubscription';
import { Calendar, Clock, MessageCircle, Users, Activity, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from './business-intelligence/MetricCard';

interface LiveOperationsTabProps {
  calendarId: string;
}

export function LiveOperationsTab({ calendarId }: LiveOperationsTabProps) {
  const { data: liveOps, isLoading } = useOptimizedLiveOperations(calendarId);
  useRealtimeSubscription(calendarId);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 bg-gradient-to-br from-slate-800/40 to-slate-900/60 rounded-2xl animate-pulse border border-slate-700/30" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Real-time Status Indicator */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
            <div className="absolute inset-0 w-4 h-4 bg-green-400 rounded-full animate-ping opacity-75"></div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Live Operations Center</h3>
            <p className="text-sm text-slate-400">Real-time data - updates automatically every 2 minutes</p>
          </div>
        </div>
        
        {liveOps?.last_updated && (
          <div className="text-right">
            <p className="text-xs text-slate-400">Last update</p>
            <p className="text-sm font-mono text-slate-300">
              {new Date(liveOps.last_updated).toLocaleTimeString('en-US')}
            </p>
          </div>
        )}
      </div>

      {/* Real-time Metrics Cards - Green Theme */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Today"
          value={String(liveOps?.today_bookings || 0)}
          subtitle="confirmed appointments"
          icon={Calendar}
          variant="green"
          delay={0.1}
        />

        <MetricCard
          title="WhatsApp Active"
          value={String(liveOps?.active_conversations_today || 0)}
          subtitle="conversations today"
          icon={MessageCircle}
          variant="green"
          delay={0.2}
        />

        <MetricCard
          title="Active Appointments"
          value={String(liveOps?.active_appointments || 0)}
          subtitle="currently ongoing"
          icon={Users}
          variant="green"
          delay={0.3}
        />

        <MetricCard
          title="Next"
          value={liveOps?.next_appointment_formatted || "None"}
          subtitle={liveOps?.next_appointment_formatted ? "until next appointment" : "scheduled today"}
          icon={Clock}
          variant="green"
          delay={0.4}
        />
      </div>

      {/* Real-time System Status & Today's Planning */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Enhanced System Status */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-green-500/20 via-emerald-500/15 to-green-500/20 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-green-500/30 rounded-2xl shadow-2xl">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl">
                  <Activity className="h-5 w-5 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-100">Live System Status</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/30">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-sm shadow-green-400/50"></div>
                    <span className="text-sm font-medium text-slate-200">Calendar Status</span>
                  </div>
                  <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10">
                    Online
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/30">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-sm shadow-green-400/50"></div>
                    <span className="text-sm font-medium text-slate-200">WhatsApp Bot</span>
                  </div>
                  <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10">
                    Active
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/30">
                  <div className="flex items-center gap-3">
                    <Zap className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-medium text-slate-200">Real-time Sync</span>
                  </div>
                  <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10">
                    Live
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Today's Planning */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-green-500/20 via-emerald-500/15 to-green-500/20 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-green-500/30 rounded-2xl shadow-2xl">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl">
                  <Calendar className="h-5 w-5 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-100">Today's Schedule</h3>
              </div>
              
              {liveOps?.next_appointment_time ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-transparent border border-green-500/20 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-100 mb-1">Next Appointment</p>
                        <p className="text-sm text-slate-300 font-mono">
                          {new Date(liveOps.next_appointment_time).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant="secondary"
                          className="bg-green-500/20 text-green-400 border-green-500/30"
                        >
                          {liveOps.next_appointment_formatted}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-slate-800/30 rounded-xl border border-slate-700/20">
                    <p className="text-sm text-slate-400">
                      View all appointments in the calendar for more details
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-2xl flex items-center justify-center border border-slate-600/30">
                    <Calendar className="h-10 w-10 text-slate-400" />
                  </div>
                  <p className="text-slate-300 font-medium mb-1">Free day today</p>
                  <p className="text-sm text-slate-400">No appointments scheduled</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
