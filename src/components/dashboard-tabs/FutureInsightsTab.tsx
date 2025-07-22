import React from 'react';
import { motion } from 'framer-motion';
import { useOptimizedFutureInsights } from '@/hooks/dashboard/useOptimizedFutureInsights';
import { useRealtimeSubscription } from '@/hooks/dashboard/useRealtimeSubscription';
import { TrendingUp, Calendar, Target, Brain, Info } from 'lucide-react';
import { MetricCard } from './business-intelligence/MetricCard';
import { DemandForecastChart } from './future-insights/DemandForecastChart';
import { SeasonalPatternsChart } from './future-insights/SeasonalPatternsChart';
import { IntelligentRecommendations } from './future-insights/IntelligentRecommendations';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface FutureInsightsTabProps {
  calendarIds: string[];
}

export function FutureInsightsTab({ calendarIds }: FutureInsightsTabProps) {
  // For now, use the first calendar ID - in the future this should aggregate across all calendars
  const primaryCalendarId = calendarIds.length > 0 ? calendarIds[0] : '';
  
  const { data: futureInsights, isLoading, error } = useOptimizedFutureInsights(primaryCalendarId);
  useRealtimeSubscription(primaryCalendarId);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-gradient-to-br from-slate-800/40 to-slate-900/60 rounded-2xl animate-pulse border border-slate-700/30" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="h-96 bg-gradient-to-br from-slate-800/40 to-slate-900/60 rounded-2xl animate-pulse border border-slate-700/30"></div>
          <div className="h-96 bg-gradient-to-br from-slate-800/40 to-slate-900/60 rounded-2xl animate-pulse border border-slate-700/30"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-400 mb-2">Error loading future insights data</p>
        <p className="text-sm text-slate-400">Please try refreshing the page</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Future Insights</h2>
            <p className="text-slate-400 mt-1">AI-powered predictions and recommendations</p>
          </div>
          {calendarIds.length > 1 && (
            <Badge variant="secondary" className="bg-purple-600/20 text-purple-300 border-purple-500/30">
              {calendarIds.length} calendars • Primary view
            </Badge>
          )}
        </div>

        {/* Future Insights Metrics - Purple Theme */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="relative"
              >
                <MetricCard
                  title="Customer Growth"
                  value={`${futureInsights?.customer_growth_rate?.toFixed(1) || '0.0'}%`}
                  subtitle="month over month"
                  icon={TrendingUp}
                  variant="purple"
                  delay={0.1}
                />
                <div className="absolute top-3 right-3 p-1 rounded-full bg-slate-800/50 backdrop-blur-sm">
                  <Info className="h-3 w-3 text-purple-400/70 hover:text-purple-300 transition-colors" />
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent 
              className="max-w-sm bg-slate-900/95 border border-purple-500/30 text-slate-100 z-50"
              side="top"
              align="center"
              sideOffset={8}
            >
              <p className="text-sm">Customer Growth Rate measures the percentage increase in new customers month-over-month. This indicates business expansion and marketing effectiveness through your WhatsApp booking assistant.</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative"
              >
                <MetricCard
                  title="Capacity Utilization"
                  value={`${futureInsights?.capacity_utilization?.toFixed(1) || '0.0'}%`}
                  subtitle="current week"
                  icon={Target}
                  variant="purple"
                  delay={0.2}
                />
                <div className="absolute top-3 right-3 p-1 rounded-full bg-slate-800/50 backdrop-blur-sm">
                  <Info className="h-3 w-3 text-purple-400/70 hover:text-purple-300 transition-colors" />
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent 
              className="max-w-sm bg-slate-900/95 border border-purple-500/30 text-slate-100 z-50"
              side="top"
              align="center"
              sideOffset={8}
            >
              <p className="text-sm">Capacity Utilization shows the percentage of available appointment slots that are currently booked this week. Higher percentages indicate efficient scheduling and strong demand.</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="relative"
              >
                <MetricCard
                  title="Demand Forecast"
                  value={`+${((futureInsights?.demand_forecast?.[0]?.bookings || 0) * 0.15).toFixed(1)}%`}
                  subtitle="next week projection"
                  icon={Calendar}
                  variant="purple"
                  delay={0.3}
                />
                <div className="absolute top-3 right-3 p-1 rounded-full bg-slate-800/50 backdrop-blur-sm">
                  <Info className="h-3 w-3 text-purple-400/70 hover:text-purple-300 transition-colors" />
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent 
              className="max-w-sm bg-slate-900/95 border border-purple-500/30 text-slate-100 z-50"
              side="top"
              align="center"
              sideOffset={8}
            >
              <p className="text-sm">Demand Forecast predicts next week's booking volume based on historical data, seasonal trends, and current booking patterns to help with resource planning.</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Demand Forecast Chart */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-violet-500/15 to-purple-500/20 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-purple-500/30 rounded-2xl shadow-2xl">
                  <DemandForecastChart data={futureInsights?.demand_forecast} />
                </div>
                <div className="absolute top-4 right-4 p-1 rounded-full bg-slate-800/50 backdrop-blur-sm">
                  <Info className="h-3 w-3 text-purple-400/70 hover:text-purple-300 transition-colors" />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent 
              className="max-w-sm bg-slate-900/95 border border-purple-500/30 text-slate-100 z-50"
              side="top"
              align="center"
              sideOffset={8}
            >
              <p className="text-sm">Weekly booking demand prediction based on historical patterns and current trends</p>
            </TooltipContent>
          </Tooltip>

          {/* Seasonal Patterns Chart */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-violet-500/15 to-purple-500/20 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-purple-500/30 rounded-2xl shadow-2xl">
                  <SeasonalPatternsChart data={futureInsights?.seasonal_patterns} />
                </div>
                <div className="absolute top-4 right-4 p-1 rounded-full bg-slate-800/50 backdrop-blur-sm">
                  <Info className="h-3 w-3 text-purple-400/70 hover:text-purple-300 transition-colors" />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent 
              className="max-w-sm bg-slate-900/95 border border-purple-500/30 text-slate-100 z-50"
              side="top"
              align="center"
              sideOffset={8}
            >
              <p className="text-sm">Monthly booking volume trends throughout the year, helping identify peak periods and plan capacity</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* AI-Powered Recommendations */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-violet-500/15 to-purple-500/20 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-purple-500/30 rounded-2xl shadow-2xl">
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-xl">
                      <Brain className="h-6 w-6 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-100">AI-Powered Recommendations</h3>
                  </div>
                  
                  <IntelligentRecommendations 
                    calendarId={primaryCalendarId}
                    customerGrowthRate={futureInsights?.customer_growth_rate}
                    capacityUtilization={futureInsights?.capacity_utilization}
                    demandForecast={futureInsights?.demand_forecast}
                    seasonalPatterns={futureInsights?.seasonal_patterns}
                  />
                </div>
              </div>
              <div className="absolute top-4 right-4 p-1 rounded-full bg-slate-800/50 backdrop-blur-sm">
                <Info className="h-3 w-3 text-purple-400/70 hover:text-purple-300 transition-colors" />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent 
            className="max-w-sm bg-slate-900/95 border border-purple-500/30 text-slate-100 z-50"
            side="top"
            align="center"
            sideOffset={8}
          >
            <p className="text-sm">Smart insights and actionable recommendations generated from your business data</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
