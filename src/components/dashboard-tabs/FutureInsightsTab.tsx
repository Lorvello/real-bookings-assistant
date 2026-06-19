
import React from 'react';
import { motion } from 'framer-motion';
import { useOptimizedFutureInsights } from '@/hooks/dashboard/useOptimizedFutureInsights';
import { useRealtimeSubscription } from '@/hooks/dashboard/useRealtimeSubscription';
import { TrendingUp, Calendar, Target, Lightbulb, Info } from 'lucide-react';
import { MetricCard } from './business-intelligence/MetricCard';
import { DemandForecastChart } from './future-insights/DemandForecastChart';
import { SeasonalPatternsChart } from './future-insights/SeasonalPatternsChart';
import { IntelligentRecommendations } from './future-insights/IntelligentRecommendations';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FutureInsightsTabProps {
  calendarIds: string[];
}

export function FutureInsightsTab({ calendarIds }: FutureInsightsTabProps) {
  const calendarId = calendarIds[0]; // Use first calendar for single-calendar features
  const { data: futureInsights, isLoading, error } = useOptimizedFutureInsights(calendarIds);
  useRealtimeSubscription(calendarId);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 surface-raised shimmer rounded-2xl border border-white/[0.08]" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="h-96 surface-raised shimmer rounded-2xl border border-white/[0.08]"></div>
          <div className="h-96 surface-raised shimmer rounded-2xl border border-white/[0.08]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-destructive-foreground mb-2">Error loading future insights data</p>
        <p className="text-sm text-muted-foreground">Please try refreshing the page</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4 md:space-y-12">
        {/* Future Insights Metrics - mono-accent - Mobile optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
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
                  value={futureInsights?.customer_growth_is_new ? 'New' : `${futureInsights?.customer_growth_rate?.toFixed(1) || '0.0'}%`}
                  subtitle={futureInsights?.customer_growth_is_new ? 'first month, no baseline yet' : 'month over month'}
                  icon={TrendingUp}
                  variant="purple"
                  delay={0.1}
                />
                <div className="absolute top-3 right-3 p-1 rounded-full bg-card/50">
                  <Info className="h-3 w-3 text-subtle-foreground/80 hover:text-foreground transition-colors" />
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent 
              className="max-w-sm bg-background/95 border border-white/[0.12] text-foreground z-50"
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
                <div className="absolute top-3 right-3 p-1 rounded-full bg-card/50">
                  <Info className="h-3 w-3 text-subtle-foreground/80 hover:text-foreground transition-colors" />
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent 
              className="max-w-sm bg-background/95 border border-white/[0.12] text-foreground z-50"
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
                  title="Upcoming Bookings"
                  value={`${futureInsights?.demand_forecast?.[0]?.bookings ?? 0}`}
                  subtitle="booked for next week"
                  icon={Calendar}
                  variant="purple"
                  delay={0.3}
                />
                <div className="absolute top-3 right-3 p-1 rounded-full bg-card/50">
                  <Info className="h-3 w-3 text-subtle-foreground/80 hover:text-foreground transition-colors" />
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent 
              className="max-w-sm bg-background/95 border border-white/[0.12] text-foreground z-50"
              side="top"
              align="center"
              sideOffset={8}
            >
              <p className="text-sm">Demand Forecast shows the number of bookings already on your calendar for the coming week, so you can plan capacity and staffing ahead of time.</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Charts Section - Mobile optimized */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-8">
          {/* Demand Forecast Chart */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative group">
                <div className="relative surface-raised rounded-2xl">
                  <DemandForecastChart data={futureInsights?.demand_forecast} />
                </div>
                <div className="absolute top-4 right-4 p-1 rounded-full bg-card/50">
                  <Info className="h-3 w-3 text-subtle-foreground/80 hover:text-foreground transition-colors" />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent 
              className="max-w-sm bg-background/95 border border-white/[0.12] text-foreground z-50"
              side="top"
              align="center"
              sideOffset={8}
            >
              <p className="text-sm">Bookings already on your calendar for the next 4 weeks, so you can plan capacity ahead.</p>
            </TooltipContent>
          </Tooltip>

          {/* Seasonal Patterns Chart */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative group">
                <div className="relative surface-raised rounded-2xl">
                  <SeasonalPatternsChart data={futureInsights?.seasonal_patterns} />
                </div>
                <div className="absolute top-4 right-4 p-1 rounded-full bg-card/50">
                  <Info className="h-3 w-3 text-subtle-foreground/80 hover:text-foreground transition-colors" />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent 
              className="max-w-sm bg-background/95 border border-white/[0.12] text-foreground z-50"
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
              <div className="relative surface-raised rounded-2xl">
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-muted/40 rounded-xl">
                      <Lightbulb className="h-6 w-6 text-accent-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Smart Tips</h3>
                  </div>
                  
                  <IntelligentRecommendations 
                    calendarId={calendarId}
                    customerGrowthRate={futureInsights?.customer_growth_rate}
                    capacityUtilization={futureInsights?.capacity_utilization}
                    demandForecast={futureInsights?.demand_forecast}
                    seasonalPatterns={futureInsights?.seasonal_patterns}
                  />
                </div>
              </div>
              <div className="absolute top-4 right-4 p-1 rounded-full bg-card/50">
                <Info className="h-3 w-3 text-subtle-foreground/80 hover:text-foreground transition-colors" />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent 
            className="max-w-sm bg-background/95 border border-white/[0.12] text-foreground z-50"
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
