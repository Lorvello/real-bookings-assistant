
import React from 'react';
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Users, Activity, CheckCircle, AlertTriangle } from 'lucide-react';

interface LiveOperationsTabProps {
  calendarIds: string[];
}

export function LiveOperationsTab({ calendarIds }: LiveOperationsTabProps) {
  const { metrics, loading, error, hasCalendar } = useDashboardAnalytics();

  if (!hasCalendar) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Live Operations</h2>
            <p className="text-slate-400 mt-1">Real-time booking activity and status</p>
          </div>
        </div>
        <div className="text-center py-16">
          <p className="text-slate-400">Selecteer een kalender om live operations te bekijken</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Live Operations</h2>
            <p className="text-slate-400 mt-1">Real-time booking activity and status</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gradient-to-br from-slate-800/40 to-slate-900/60 rounded-2xl animate-pulse border border-slate-700/30" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Live Operations</h2>
            <p className="text-slate-400 mt-1">Real-time booking activity and status</p>
          </div>
        </div>
        <div className="text-center py-16">
          <p className="text-red-400 mb-2">Error loading live operations data</p>
          <p className="text-sm text-slate-400">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  const liveMetrics = [
    {
      title: "Today's Bookings",
      value: metrics.today_bookings,
      icon: Calendar,
      color: 'text-green-400',
      bgColor: 'bg-green-900/20',
      subtitle: 'Scheduled today'
    },
    {
      title: 'Pending',
      value: metrics.pending_bookings,
      icon: Clock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-900/20',
      subtitle: 'Awaiting confirmation'
    },
    {
      title: 'This Week',
      value: metrics.week_bookings,
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
      subtitle: 'Total bookings'
    },
    {
      title: 'WhatsApp Active',
      value: metrics.whatsapp_conversations,
      icon: Activity,
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/20',
      subtitle: 'Active conversations'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Live Operations</h2>
          <p className="text-slate-400 mt-1">Real-time booking activity and status</p>
        </div>
        {calendarIds.length > 1 && (
          <Badge variant="secondary" className="bg-green-600/20 text-green-300 border-green-500/30">
            {calendarIds.length} calendars • Primary view
          </Badge>
        )}
      </div>

      {/* Real-time Status Indicator */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>Live data - real-time updates enabled</span>
        <span className="ml-2">
          (laatste update: {new Date().toLocaleTimeString('nl-NL')})
        </span>
      </div>

      {/* Live Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {liveMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index} className={`${metric.bgColor} border-slate-700/50 hover:scale-105 transition-transform duration-200 shadow-xl`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">
                  {metric.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-100">
                  {metric.value}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {metric.subtitle}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* WhatsApp Integration Status */}
      {metrics.whatsapp_conversations > 0 && (
        <Card className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-500/30 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-100">WhatsApp Bot Active</h3>
                <p className="text-sm text-slate-400">
                  {metrics.whatsapp_conversations} active conversations • {metrics.whatsapp_messages_today} messages today
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Multiple Calendar Notice */}
      {calendarIds.length > 1 && (
        <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-100">Multiple Calendar Live Operations</h3>
                <p className="text-sm text-slate-400">
                  Currently showing live data from the primary calendar. Full multi-calendar aggregation coming soon.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
