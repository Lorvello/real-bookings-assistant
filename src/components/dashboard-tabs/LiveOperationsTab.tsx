import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOptimizedLiveOperations } from '@/hooks/dashboard/useOptimizedLiveOperations';
import { useRealtimeSubscription } from '@/hooks/dashboard/useRealtimeSubscription';
import { Calendar, Clock, MessageCircle, Users, AlertCircle, CheckCircle, Activity, Zap } from 'lucide-react';

interface LiveOperationsTabProps {
  calendarId: string;
}

export function LiveOperationsTab({ calendarId }: LiveOperationsTabProps) {
  // Use optimized hook and real-time subscription
  const { data: liveOps, isLoading } = useOptimizedLiveOperations(calendarId);
  useRealtimeSubscription(calendarId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gradient-to-br from-slate-800/40 to-slate-900/60 rounded-2xl animate-pulse border border-slate-700/30" />
          ))}
        </div>
      </div>
    );
  }

  const nextAppointmentTime = liveOps?.next_appointment_time 
    ? new Date(liveOps.next_appointment_time)
    : null;

  const timeUntilNext = nextAppointmentTime 
    ? Math.max(0, Math.floor((nextAppointmentTime.getTime() - Date.now()) / (1000 * 60)))
    : null;

  const metrics = [
    {
      title: "Vandaag",
      value: liveOps?.today_bookings || 0,
      subtitle: `${liveOps?.today_confirmed || 0} bevestigd, ${liveOps?.today_pending || 0} wachtend`,
      icon: Calendar,
      gradient: "from-green-500/20 via-green-400/10 to-transparent",
      iconColor: "text-green-400",
      borderColor: "border-green-500/30",
      glowColor: "shadow-green-500/25"
    },
    {
      title: "Nu Actief",
      value: liveOps?.currently_active_bookings || 0,
      subtitle: "lopende afspraken",
      icon: Users,
      gradient: "from-green-500/20 via-green-400/10 to-transparent",
      iconColor: "text-green-400",
      borderColor: "border-green-500/30",
      glowColor: "shadow-green-500/25"
    },
    {
      title: "WhatsApp",
      value: liveOps?.whatsapp_messages_last_hour || 0,
      subtitle: "berichten laatste uur",
      icon: MessageCircle,
      gradient: "from-blue-500/20 via-blue-400/10 to-transparent",
      iconColor: "text-blue-400",
      borderColor: "border-blue-500/30",
      glowColor: "shadow-blue-500/25"
    },
    {
      title: "Volgende",
      value: timeUntilNext !== null ? `${timeUntilNext}m` : "Geen",
      subtitle: timeUntilNext !== null ? "tot volgende afspraak" : "geplande afspraken",
      icon: Clock,
      gradient: "from-blue-500/20 via-blue-400/10 to-transparent",
      iconColor: "text-blue-400",
      borderColor: "border-blue-500/30",
      glowColor: "shadow-blue-500/25"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Real-time Status Indicator */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
            <div className="absolute inset-0 w-4 h-4 bg-green-400 rounded-full animate-ping opacity-75"></div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Live Operations Center</h3>
            <p className="text-sm text-slate-400">Real-time data - updates automatisch</p>
          </div>
        </div>
        
        {liveOps?.last_updated && (
          <div className="text-right">
            <p className="text-xs text-slate-400">Laatste update</p>
            <p className="text-sm font-mono text-slate-300">
              {new Date(liveOps.last_updated).toLocaleTimeString('nl-NL')}
            </p>
          </div>
        )}
      </div>

      {/* Enhanced Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <div
            key={metric.title}
            className={`relative group overflow-hidden rounded-2xl bg-gradient-to-br ${metric.gradient} backdrop-blur-xl border ${metric.borderColor} shadow-xl ${metric.glowColor} hover:shadow-2xl transition-all duration-300`}
            style={{
              animation: `fadeIn 0.6s ease-out ${index * 0.1}s both`
            }}
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
            
            {/* Content */}
            <div className="relative p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-300 mb-1">{metric.title}</p>
                  <p className="text-3xl font-bold text-slate-100 mb-1">{metric.value}</p>
                  <p className="text-xs text-slate-400">{metric.subtitle}</p>
                </div>
                <div className={`p-3 rounded-xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 ${metric.iconColor}`}>
                  <metric.icon className="h-6 w-6" />
                </div>
              </div>
              
              {/* Status indicator for critical metrics */}
              {metric.title === "Vandaag" && liveOps?.today_pending && liveOps.today_pending > 0 && (
                <div className="flex items-center gap-2 mt-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <AlertCircle className="h-3 w-3 text-blue-400" />
                  <span className="text-xs text-blue-200">{liveOps.today_pending} wachten op bevestiging</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Status Dashboard & Today's Planning */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Enhanced Status Dashboard */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-green-500/30 via-blue-500/20 to-green-500/30 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-slate-700/50 rounded-2xl shadow-2xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-xl">
                  <Activity className="h-5 w-5 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-100">System Status</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/30">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-sm shadow-green-400/50"></div>
                    <span className="text-sm font-medium text-slate-200">Kalender Status</span>
                  </div>
                  <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10">
                    Online
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/30">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium text-slate-200">WhatsApp Bot</span>
                  </div>
                  <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">
                    Actief
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
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/30 via-green-500/20 to-blue-500/30 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-slate-700/50 rounded-2xl shadow-2xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-blue-500/20 to-green-500/20 rounded-xl">
                  <Calendar className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-100">Vandaag's Planning</h3>
              </div>
              
              {nextAppointmentTime ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-blue-500/10 via-green-500/5 to-transparent border border-blue-500/20 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-100 mb-1">Volgende Afspraak</p>
                        <p className="text-sm text-slate-300 font-mono">
                          {nextAppointmentTime.toLocaleTimeString('nl-NL', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={timeUntilNext && timeUntilNext < 30 ? "destructive" : "secondary"}
                          className={`${
                            timeUntilNext && timeUntilNext < 30 
                              ? "bg-blue-500/20 text-blue-400 border-blue-500/30" 
                              : "bg-green-500/20 text-green-400 border-green-500/30"
                          }`}
                        >
                          {timeUntilNext && timeUntilNext < 60 
                            ? `${timeUntilNext} min`
                            : `${Math.floor((timeUntilNext || 0) / 60)}u ${(timeUntilNext || 0) % 60}m`
                          }
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-slate-800/30 rounded-xl border border-slate-700/20">
                    <p className="text-sm text-slate-400">
                      Bekijk alle afspraken in de kalender voor meer details
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-2xl flex items-center justify-center border border-slate-600/30">
                    <Calendar className="h-10 w-10 text-slate-400" />
                  </div>
                  <p className="text-slate-300 font-medium mb-1">Geen afspraken gepland</p>
                  <p className="text-sm text-slate-400">voor vandaag</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
