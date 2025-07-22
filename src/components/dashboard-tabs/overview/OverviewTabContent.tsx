
import React from 'react';
import { motion } from 'framer-motion';
import { useOptimizedAnalytics } from '@/hooks/useOptimizedAnalytics';
import { useRealtimeSubscription } from '@/hooks/dashboard/useRealtimeSubscription';
import { Calendar, Users, Clock, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCalendarContext } from '@/contexts/CalendarContext';

interface OverviewTabContentProps {
  calendarIds: string[];
}

export function OverviewTabContent({ calendarIds }: OverviewTabContentProps) {
  const { calendars } = useCalendarContext();
  
  // For multiple calendars, we'll aggregate data from the first calendar for now
  // In a real implementation, you'd want to create a hook that aggregates across all calendars
  const primaryCalendarId = calendarIds.length > 0 ? calendarIds[0] : undefined;
  const { analytics, loading, error } = useOptimizedAnalytics(primaryCalendarId);
  
  // Set up real-time subscription for the primary calendar
  useRealtimeSubscription(primaryCalendarId);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-gradient-to-br from-slate-800/40 to-slate-900/60 rounded-2xl animate-pulse border border-slate-700/30" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-400 mb-2">Error loading overview data</p>
        <p className="text-sm text-slate-400">Please try refreshing the page</p>
      </div>
    );
  }

  const getSelectedCalendarsText = () => {
    if (calendarIds.length === 1) {
      const calendar = calendars.find(cal => cal.id === calendarIds[0]);
      return calendar?.name || 'Unknown Calendar';
    }
    if (calendarIds.length === calendars.length) {
      return 'All Calendars';
    }
    return `${calendarIds.length} Selected Calendars`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Overview</h2>
          <p className="text-slate-400 mt-1">
            Performance metrics for {getSelectedCalendarsText()}
          </p>
        </div>
        {calendarIds.length > 1 && (
          <Badge variant="secondary" className="bg-slate-700 text-slate-200">
            {calendarIds.length} calendars
          </Badge>
        )}
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/50 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-100">
                {analytics?.calendarStats?.total_bookings || 0}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                All time bookings
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/50 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Completed</CardTitle>
              <Users className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-100">
                {analytics?.calendarStats?.completed_bookings || 0}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Successfully completed
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/50 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Avg Duration</CardTitle>
              <Clock className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-100">
                {analytics?.calendarStats?.avg_duration_minutes || 0}m
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Average appointment time
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/50 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-100">
                €{analytics?.calendarStats?.total_revenue?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Total earned revenue
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Service Performance */}
      {analytics?.serviceTypeStats && analytics.serviceTypeStats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/50 shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-100">Service Performance</CardTitle>
              <p className="text-sm text-slate-400">Breakdown by service type</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.serviceTypeStats.slice(0, 5).map((service, index) => (
                  <div key={service.service_type_id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-200">{service.service_name}</span>
                        <Badge variant="outline" className="text-xs">{service.booking_count} bookings</Badge>
                      </div>
                      <div className="text-sm text-slate-400">
                        Avg: {service.avg_duration}min • €{service.total_revenue.toFixed(2)} revenue
                      </div>
                    </div>
                    <TrendingUp className="h-4 w-4 text-green-400" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {calendarIds.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100">Multiple Calendar View</h3>
                  <p className="text-sm text-slate-400">
                    Currently showing data from the primary calendar. Full multi-calendar aggregation coming soon.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
