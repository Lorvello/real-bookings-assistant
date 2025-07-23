
import React from 'react';
import { useNextAppointment } from '@/hooks/dashboard/useNextAppointment';
import { usePopularService } from '@/hooks/dashboard/usePopularService';
import { useWeeklyInsights } from '@/hooks/dashboard/useWeeklyInsights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Star, TrendingUp, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

interface OverviewTabProps {
  calendarIds: string[];
}

export function OverviewTab({ calendarIds }: OverviewTabProps) {
  const { data: nextAppointment, isLoading: nextLoading } = useNextAppointment(calendarIds);
  const { data: popularService, isLoading: popularLoading } = usePopularService(calendarIds);
  const { data: weeklyInsights, isLoading: weeklyLoading } = useWeeklyInsights(calendarIds);

  if (nextLoading || popularLoading || weeklyLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Next Appointment Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Volgende Afspraak
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextAppointment ? (
              <>
                <div className="text-2xl font-bold text-blue-900 mb-1">
                  {nextAppointment.time_until}
                </div>
                <div className="text-sm text-blue-700">
                  {nextAppointment.customer_name}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  {nextAppointment.service_name}
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-blue-900 mb-1">
                  Geen afspraken
                </div>
                <div className="text-sm text-blue-700">
                  Vandaag geen afspraken gepland
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Popular Service Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800 flex items-center gap-2">
              <Star className="h-4 w-4" />
              Populairste Service
            </CardTitle>
          </CardHeader>
          <CardContent>
            {popularService ? (
              <>
                <div className="text-2xl font-bold text-green-900 mb-1">
                  {popularService.percentage}%
                </div>
                <div className="text-sm text-green-700">
                  {popularService.service_name}
                </div>
                <div className="text-xs text-green-600 mt-1">
                  {popularService.booking_count} boekingen deze maand
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-green-900 mb-1">
                  Geen data
                </div>
                <div className="text-sm text-green-700">
                  Nog geen boekingen
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Weekly Growth Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-800 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Weekgroei
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyInsights ? (
              <>
                <div className="text-2xl font-bold text-purple-900 mb-1 flex items-center gap-2">
                  {weeklyInsights.growth_percentage >= 0 ? '+' : ''}{weeklyInsights.growth_percentage.toFixed(1)}%
                  {weeklyInsights.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-600" />}
                  {weeklyInsights.trend === 'down' && <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />}
                </div>
                <div className="text-sm text-purple-700">
                  {weeklyInsights.current_week} deze week
                </div>
                <div className="text-xs text-purple-600 mt-1">
                  vs {weeklyInsights.previous_week} vorige week
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-purple-900 mb-1">
                  Geen data
                </div>
                <div className="text-sm text-purple-700">
                  Nog geen vergelijking mogelijk
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
