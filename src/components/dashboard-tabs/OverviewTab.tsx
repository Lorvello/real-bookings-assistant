
import React from 'react';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useNextAppointment } from '@/hooks/dashboard/useNextAppointment';
import { usePopularService } from '@/hooks/dashboard/usePopularService';
import { useWeeklyInsights } from '@/hooks/dashboard/useWeeklyInsights';
import { CalendarManagement } from '@/components/dashboard/CalendarManagement';
import { DateRange } from '@/components/dashboard/DateRangeFilter';
import { Clock, Star, TrendingUp, Calendar, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="border-border/60 bg-card/80 backdrop-blur-sm hover:bg-card/90 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Next Appointment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nextAppointment ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <p className="font-semibold text-foreground">{nextAppointment.customer_name}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{nextAppointment.service_name}</p>
                  <p className="text-lg font-bold text-primary">{nextAppointment.time_until}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">No upcoming appointments</p>
                  <p className="text-lg font-bold text-muted-foreground">-</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Popular Service Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="border-border/60 bg-card/80 backdrop-blur-sm hover:bg-card/90 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Star className="h-4 w-4" />
                Popular Service
              </CardTitle>
            </CardHeader>
            <CardContent>
              {popularService ? (
                <div className="space-y-2">
                  <p className="font-semibold text-foreground">{popularService.service_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {popularService.booking_count} bookings ({popularService.percentage}%)
                  </p>
                  <p className="text-lg font-bold text-primary">Last 30 days</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">No service data</p>
                  <p className="text-lg font-bold text-muted-foreground">-</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Weekly Insights Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="border-border/60 bg-card/80 backdrop-blur-sm hover:bg-card/90 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Weekly Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyInsights ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">This week:</span>
                    <span className="font-semibold text-foreground">{weeklyInsights.current_week}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Last week:</span>
                    <span className="font-semibold text-foreground">{weeklyInsights.previous_week}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className={`h-4 w-4 ${
                      weeklyInsights.trend === 'up' ? 'text-green-500' : 
                      weeklyInsights.trend === 'down' ? 'text-red-500' : 
                      'text-muted-foreground'
                    }`} />
                    <p className="text-lg font-bold text-primary">
                      {weeklyInsights.growth_percentage >= 0 ? '+' : ''}{weeklyInsights.growth_percentage}%
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">No insights available</p>
                  <p className="text-lg font-bold text-muted-foreground">-</p>
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
