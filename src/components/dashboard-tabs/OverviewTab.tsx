
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
        >
          <Card className="bg-cyan-900/20 border-gray-700 hover:scale-105 transition-transform duration-200 h-44">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                Next Appointment
              </CardTitle>
              <Clock className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent>
              {nextAppointment ? (
                <div className="space-y-3">
                  <div className="text-2xl font-bold text-white">
                    {nextAppointment.time_until}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white">
                      {nextAppointment.service_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {nextAppointment.customer_name}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400 text-center text-sm">No upcoming appointments</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Popular Service Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="bg-cyan-900/20 border-gray-700 hover:scale-105 transition-transform duration-200 h-44">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                Popular Service
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent>
              {popularService ? (
                <div className="space-y-3">
                  <div className="text-2xl font-bold text-white">
                    {popularService.percentage.toFixed(0)}%
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-white">
                      {popularService.service_name}
                    </p>
                    <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-cyan-400 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${popularService.percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400">
                      {popularService.booking_count} bookings this month
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400 text-center text-sm">No booking data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Weekly Insights Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="bg-cyan-900/20 border-gray-700 hover:scale-105 transition-transform duration-200 h-44">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                Weekly Growth
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent>
              {weeklyInsights ? (
                <div className="space-y-3">
                  <div className={`text-2xl font-bold ${
                    weeklyInsights.trend === 'up' ? 'text-green-400' : 
                    weeklyInsights.trend === 'down' ? 'text-red-400' : 'text-cyan-400'
                  }`}>
                    {weeklyInsights.trend === 'up' ? '+' : weeklyInsights.trend === 'down' ? '-' : ''}
                    {Math.abs(weeklyInsights.growth_percentage)}%
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {weeklyInsights.trend === 'up' ? (
                        <ArrowUp className="h-4 w-4 text-green-400" />
                      ) : weeklyInsights.trend === 'down' ? (
                        <ArrowDown className="h-4 w-4 text-red-400" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-cyan-400" />
                      )}
                      <span className="text-xs text-gray-400">
                        vs last week
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      This week: {weeklyInsights.current_week} • Last week: {weeklyInsights.previous_week}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400 text-center text-sm">No weekly data available</p>
                </div>
              )}
            </CardContent>
          </Card>
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
