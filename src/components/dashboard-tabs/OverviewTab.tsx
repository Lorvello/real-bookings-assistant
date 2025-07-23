
import React from 'react';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useNextAppointment } from '@/hooks/dashboard/useNextAppointment';
import { usePopularService } from '@/hooks/dashboard/usePopularService';
import { useWeeklyInsights } from '@/hooks/dashboard/useWeeklyInsights';
import { CalendarManagement } from '@/components/dashboard/CalendarManagement';
import { DateRange } from '@/components/dashboard/DateRangeFilter';
import { Clock, Star, TrendingUp, TrendingDown, Calendar, User, Award, Activity, Target } from 'lucide-react';
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
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="border-border/60 bg-gradient-to-br from-card to-card/80 hover:shadow-lg hover:scale-105 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Volgende Afspraak
              </CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              {nextAppointment ? (
                <div className="space-y-3">
                  <div className="text-2xl font-bold text-foreground">
                    {nextAppointment.time_until}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-primary" />
                      <p className="text-sm font-medium text-foreground">{nextAppointment.customer_name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{nextAppointment.service_name}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    <Activity className="h-3 w-3 mr-1" />
                    Vandaag
                  </Badge>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-2xl font-bold text-muted-foreground">-</div>
                  <p className="text-sm text-muted-foreground">Geen afspraken vandaag</p>
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 mr-1" />
                    Vrije dag
                  </Badge>
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
          <Card className="border-border/60 bg-gradient-to-br from-card to-card/80 hover:shadow-lg hover:scale-105 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Populairste Service
              </CardTitle>
              <Award className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              {popularService ? (
                <div className="space-y-3">
                  <div className="text-2xl font-bold text-foreground">
                    {popularService.percentage}%
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{popularService.service_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {popularService.booking_count} {popularService.booking_count === 1 ? 'boeking' : 'boekingen'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(popularService.percentage, 100)}%` }}
                      />
                    </div>
                    <Target className="h-3 w-3 text-green-600" />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-2xl font-bold text-muted-foreground">-</div>
                  <p className="text-sm text-muted-foreground">Geen service data</p>
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    <Star className="h-3 w-3 mr-1" />
                    Laatste 30 dagen
                  </Badge>
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
          <Card className="border-border/60 bg-gradient-to-br from-card to-card/80 hover:shadow-lg hover:scale-105 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Week Trend
              </CardTitle>
              <div className="flex items-center gap-1">
                {weeklyInsights && weeklyInsights.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : weeklyInsights && weeklyInsights.trend === 'down' ? (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                ) : (
                  <Activity className="h-4 w-4 text-purple-600" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {weeklyInsights ? (
                <div className="space-y-3">
                  <div className="text-2xl font-bold text-foreground">
                    {weeklyInsights.growth_percentage >= 0 ? '+' : ''}{weeklyInsights.growth_percentage}%
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Deze week:</span>
                      <span className="font-medium text-foreground">{weeklyInsights.current_week}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Vorige week:</span>
                      <span className="font-medium text-foreground">{weeklyInsights.previous_week}</span>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      weeklyInsights.trend === 'up' ? 'border-green-600 text-green-600' :
                      weeklyInsights.trend === 'down' ? 'border-red-600 text-red-600' :
                      'border-muted text-muted-foreground'
                    }`}
                  >
                    {weeklyInsights.trend === 'up' ? (
                      <>
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Groei
                      </>
                    ) : weeklyInsights.trend === 'down' ? (
                      <>
                        <TrendingDown className="h-3 w-3 mr-1" />
                        Daling
                      </>
                    ) : (
                      <>
                        <Activity className="h-3 w-3 mr-1" />
                        Stabiel
                      </>
                    )}
                  </Badge>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-2xl font-bold text-muted-foreground">-</div>
                  <p className="text-sm text-muted-foreground">Geen week data</p>
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 mr-1" />
                    7 dagen
                  </Badge>
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
