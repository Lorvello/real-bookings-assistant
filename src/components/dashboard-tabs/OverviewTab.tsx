
import React from 'react';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useNextAppointment } from '@/hooks/dashboard/useNextAppointment';
import { usePopularService } from '@/hooks/dashboard/usePopularService';
import { useWeeklyInsights } from '@/hooks/dashboard/useWeeklyInsights';
import { CalendarManagement } from '@/components/dashboard/CalendarManagement';
import { DateRange } from '@/components/dashboard/DateRangeFilter';
import { Clock, Star, TrendingUp, TrendingDown, Calendar, User, Award, Activity, Target, ArrowUp, ArrowDown, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { SubscriptionOverview } from '@/components/ui/SubscriptionOverview';

interface OverviewTabProps {
  calendarIds: string[];
  dateRange: DateRange;
}

export function OverviewTab({ calendarIds, dateRange }: OverviewTabProps) {
  const { calendars } = useCalendarContext();
  
  // Fetch data using the aggregated hooks
  const { data: nextAppointment, isLoading: nextLoading } = useNextAppointment(calendarIds);
  const { data: popularService, isLoading: popularLoading } = usePopularService(calendarIds);
  const { data: weeklyInsights, isLoading: weeklyLoading } = useWeeklyInsights(calendarIds);

  const isLoading = nextLoading || popularLoading || weeklyLoading;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/60 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <div className="h-6 bg-muted animate-pulse rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-8 bg-muted animate-pulse rounded"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="h-64 bg-muted animate-pulse rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-2 md:space-y-8">
      {/* Top Row - 3 Cards - Mobile optimized with smaller heights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-6">
        {/* Next Appointment Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative group"
        >
          <div className="absolute -inset-1 md:-inset-2 bg-gradient-to-br from-cyan-500/40 to-cyan-400/30 blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300 rounded-2xl"></div>
          <div className="relative bg-gradient-to-br from-slate-800/95 via-slate-900/90 to-slate-800/95 backdrop-blur-xl border border-cyan-500/30 rounded-lg md:rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:scale-[1.02] h-20 md:h-44 p-1.5 md:p-6">
            <div className="flex items-center justify-between mb-1 md:mb-4">
              <h3 className="text-xs md:text-sm font-bold text-slate-300 uppercase tracking-wider">
                Next Appointment
              </h3>
              <div className="w-6 h-6 md:w-12 md:h-12 bg-gradient-to-br from-cyan-500/20 to-cyan-400/20 rounded-md md:rounded-xl flex items-center justify-center shadow-lg">
                <Clock className="h-3 w-3 md:h-6 md:w-6 text-cyan-400" />
              </div>
            </div>
            
            <div className="flex-1 flex flex-col justify-center">
              {nextAppointment ? (
                <>
                  <div className="text-lg md:text-4xl font-black text-slate-100 leading-none tabular-nums mb-0.5 md:mb-2">
                    {nextAppointment.time_until}
                  </div>
                  <div className="text-xs md:text-sm text-slate-400 font-medium truncate">
                    {nextAppointment.service_name} • {nextAppointment.customer_name}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-lg md:text-4xl font-black text-slate-100 leading-none tabular-nums mb-0.5 md:mb-2">
                    --:--
                  </div>
                  <div className="text-xs md:text-sm text-slate-400 font-medium">
                    No appointments today
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Popular Service Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative group"
        >
          <div className="absolute -inset-1 md:-inset-2 bg-gradient-to-br from-cyan-500/40 to-cyan-400/30 blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300 rounded-2xl"></div>
          <div className="relative bg-gradient-to-br from-slate-800/95 via-slate-900/90 to-slate-800/95 backdrop-blur-xl border border-cyan-500/30 rounded-lg md:rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:scale-[1.02] h-20 md:h-44 p-1.5 md:p-6">
            <div className="flex items-center justify-between mb-1 md:mb-4">
              <h3 className="text-xs md:text-sm font-bold text-slate-300 uppercase tracking-wider">
                Popular Service
              </h3>
              <div className="w-6 h-6 md:w-12 md:h-12 bg-gradient-to-br from-cyan-500/20 to-cyan-400/20 rounded-md md:rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="h-3 w-3 md:h-6 md:w-6 text-cyan-400" />
              </div>
            </div>
            
            <div className="flex-1 flex flex-col justify-center">
              {popularService ? (
                <>
                  <div className="text-lg md:text-4xl font-black text-slate-100 leading-none tabular-nums mb-0.5 md:mb-2">
                    {popularService.percentage.toFixed(0)}%
                  </div>
                  <div className="text-xs md:text-sm text-slate-400 font-medium truncate">
                    {popularService.service_name} • {popularService.booking_count} bookings
                  </div>
                </>
              ) : (
                <>
                  <div className="text-lg md:text-4xl font-black text-slate-100 leading-none tabular-nums mb-0.5 md:mb-2">
                    --%
                  </div>
                  <div className="text-xs md:text-sm text-slate-400 font-medium">
                    No data available
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Weekly Growth Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative group"
        >
          <div className="absolute -inset-1 md:-inset-2 bg-gradient-to-br from-cyan-500/40 to-cyan-400/30 blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300 rounded-2xl"></div>
          <div className="relative bg-gradient-to-br from-slate-800/95 via-slate-900/90 to-slate-800/95 backdrop-blur-xl border border-cyan-500/30 rounded-lg md:rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:scale-[1.02] h-20 md:h-44 p-1.5 md:p-6">
            <div className="flex items-center justify-between mb-1 md:mb-4">
              <h3 className="text-xs md:text-sm font-bold text-slate-300 uppercase tracking-wider">
                Weekly Growth
              </h3>
              <div className="w-6 h-6 md:w-12 md:h-12 bg-gradient-to-br from-cyan-500/20 to-cyan-400/20 rounded-md md:rounded-xl flex items-center justify-center shadow-lg">
                <BarChart3 className="h-3 w-3 md:h-6 md:w-6 text-cyan-400" />
              </div>
            </div>
            
            <div className="flex-1 flex flex-col justify-center">
              {weeklyInsights ? (
                <>
                  <div className="text-lg md:text-4xl font-black text-slate-100 leading-none tabular-nums mb-0.5 md:mb-2">
                    {weeklyInsights.trend === 'up' ? '+' : weeklyInsights.trend === 'down' ? '-' : ''}
                    {Math.abs(weeklyInsights.growth_percentage)}%
                  </div>
                  <div className="text-xs md:text-sm text-slate-400 font-medium truncate">
                    {weeklyInsights.trend === 'up' ? '↗️ Rising' : weeklyInsights.trend === 'down' ? '↘️ Falling' : 'Stable'} • vs last week
                  </div>
                </>
              ) : (
                <>
                  <div className="text-lg md:text-4xl font-black text-slate-100 leading-none tabular-nums mb-0.5 md:mb-2">
                    --.--%
                  </div>
                  <div className="text-xs md:text-sm text-slate-400 font-medium">
                    No data available
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Calendar Management Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <CalendarManagement calendars={calendars} />
      </motion.div>

      {/* Subscription Overview - Only on Overview tab */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <SubscriptionOverview />
      </motion.div>
    </div>
  );
}
