
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
    <div className="space-y-8">
      {/* Top Row - 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Next Appointment Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="group"
        >
          <div className="relative h-44 rounded-xl bg-gradient-to-br from-slate-800/95 via-slate-900/90 to-slate-800/95 p-6 border border-rose-500/30 backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-rose-500/25">
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-rose-500/40 to-pink-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl" />
            
            <div className="flex items-start justify-between h-full">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-gradient-to-br from-rose-500/20 to-pink-500/20 rounded-xl border border-rose-500/30">
                    <Clock className="h-5 w-5 text-rose-400" />
                  </div>
                  <h3 className="text-sm font-medium text-slate-400">Next Appointment</h3>
                </div>
                
                {nextAppointment ? (
                  <div className="space-y-3">
                    <div className="text-4xl font-bold bg-gradient-to-r from-rose-400 to-pink-400 bg-clip-text text-transparent">
                      {nextAppointment.time_until}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-white">
                        {nextAppointment.service_name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {nextAppointment.customer_name}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-slate-400 text-center text-sm">No upcoming appointments</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Popular Service Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="group"
        >
          <div className="relative h-44 rounded-xl bg-gradient-to-br from-slate-800/95 via-slate-900/90 to-slate-800/95 p-6 border border-rose-500/30 backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-rose-500/25">
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-rose-500/40 to-pink-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl" />
            
            <div className="flex items-start justify-between h-full">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-gradient-to-br from-rose-500/20 to-pink-500/20 rounded-xl border border-rose-500/30">
                    <TrendingUp className="h-5 w-5 text-rose-400" />
                  </div>
                  <h3 className="text-sm font-medium text-slate-400">Popular Service</h3>
                </div>
                
                {popularService ? (
                  <div className="space-y-3">
                    <div className="text-4xl font-bold bg-gradient-to-r from-rose-400 to-pink-400 bg-clip-text text-transparent">
                      {popularService.percentage.toFixed(0)}%
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-white">
                        {popularService.service_name}
                      </p>
                      <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-rose-500 to-pink-500 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${popularService.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400">
                        {popularService.booking_count} bookings this month
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-slate-400 text-center text-sm">No booking data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Weekly Insights Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="group"
        >
          <div className="relative h-44 rounded-xl bg-gradient-to-br from-slate-800/95 via-slate-900/90 to-slate-800/95 p-6 border border-rose-500/30 backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-rose-500/25">
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-rose-500/40 to-pink-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl" />
            
            <div className="flex items-start justify-between h-full">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-gradient-to-br from-rose-500/20 to-pink-500/20 rounded-xl border border-rose-500/30">
                    <BarChart3 className="h-5 w-5 text-rose-400" />
                  </div>
                  <h3 className="text-sm font-medium text-slate-400">Weekly Growth</h3>
                </div>
                
                {weeklyInsights ? (
                  <div className="space-y-3">
                    <div className={`text-4xl font-bold ${
                      weeklyInsights.trend === 'up' ? 'bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent' : 
                      weeklyInsights.trend === 'down' ? 'bg-gradient-to-r from-red-400 to-rose-400 bg-clip-text text-transparent' : 
                      'bg-gradient-to-r from-rose-400 to-pink-400 bg-clip-text text-transparent'
                    }`}>
                      {weeklyInsights.trend === 'up' ? '+' : weeklyInsights.trend === 'down' ? '-' : ''}
                      {Math.abs(weeklyInsights.growth_percentage)}%
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {weeklyInsights.trend === 'up' ? (
                          <ArrowUp className="h-4 w-4 text-emerald-400" />
                        ) : weeklyInsights.trend === 'down' ? (
                          <ArrowDown className="h-4 w-4 text-red-400" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-rose-400" />
                        )}
                        <span className="text-xs text-slate-400">
                          vs last week
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        This week: {weeklyInsights.current_week} • Last week: {weeklyInsights.previous_week}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-slate-400 text-center text-sm">No weekly data available</p>
                  </div>
                )}
              </div>
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
    </div>
  );
}
