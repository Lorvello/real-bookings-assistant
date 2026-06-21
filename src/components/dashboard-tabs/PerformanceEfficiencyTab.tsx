import React from 'react';
import { useOptimizedPerformanceEfficiency } from '@/hooks/dashboard/useOptimizedPerformanceEfficiency';
import { useRealtimeSubscription } from '@/hooks/dashboard/useRealtimeSubscription';
import { useAccessControl } from '@/hooks/useAccessControl';
import { AlertTriangle, XCircle, Star, CheckCircle, Activity, Info, Users, UserCheck, User } from 'lucide-react';
import { MetricCard } from './business-intelligence/MetricCard';
import { PeakHoursChart } from './performance/PeakHoursChart';
import { DateRange } from '@/components/dashboard/DateRangeFilter';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';

interface PerformanceEfficiencyTabProps {
  calendarIds: string[];
  dateRange: DateRange;
}

// Helper function to generate dynamic period text for tooltips
const getDynamicPeriodText = (dateRange: DateRange): string => {
  if (!dateRange) return "in the selected period";
  
  switch (dateRange.preset) {
    case 'last7days':
      return "in the last 7 days";
    case 'last30days':
      return "in the last 30 days";
    case 'last3months':
      return "in the last 3 months";
    case 'lastyear':
      return "in the last year";
    case 'custom':
      return "in the selected period";
    default:
      return "in the selected period";
  }
};

export function PerformanceEfficiencyTab({ calendarIds, dateRange }: PerformanceEfficiencyTabProps) {
  const { accessControl } = useAccessControl();

  const { data: performance, isLoading: performanceLoading, error: performanceError } = useOptimizedPerformanceEfficiency(
    calendarIds,
    dateRange?.startDate,
    dateRange?.endDate
  );

  // Subscribe to real-time updates for the primary calendar (first in array)
  const primaryCalendarId = calendarIds[0];
  useRealtimeSubscription(primaryCalendarId);

  // Safety guard AFTER all hooks (Rules of Hooks): render the skeleton until a valid
  // dateRange is seeded. The hook returns null for an undefined range, so no query fires.
  if (!dateRange || !dateRange.startDate || !dateRange.endDate) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-44 surface-raised shimmer rounded-2xl border border-white/[0.08]"
            />
          ))}
        </div>
        <div className="h-96 surface-raised shimmer rounded-2xl border border-white/[0.08]"></div>
      </div>
    );
  }

  const isLoading = performanceLoading;
  const error = performanceError;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              className="h-44 surface-raised shimmer rounded-2xl border border-white/[0.08]"
            />
          ))}
        </div>
        <div className="h-96 surface-raised shimmer rounded-2xl border border-white/[0.08]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-destructive-foreground mb-2">Error loading performance data</p>
        <p className="text-sm text-muted-foreground">Please try refreshing the page</p>
      </div>
    );
  }

  // Create dynamic labels based on date range
  const getMetricSubtitle = (baseText: string) => {
    if (dateRange.preset === 'custom') {
      return `${dateRange.label}`;
    }
    return `${dateRange.label.toLowerCase()}`;
  };

  // Get dynamic period text for tooltips
  const periodText = getDynamicPeriodText(dateRange);

  return (
    <TooltipProvider>
      <div className="space-y-4 md:space-y-12">
        {/* Operational Performance Metrics - mono-accent - Mobile optimized */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${accessControl.canAccessCustomerSatisfaction ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3 md:gap-6`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="relative"
              >
                <MetricCard
                  title="No-Show Rate"
                  value={`${performance?.no_show_rate?.toFixed(1) || '0.0'}%`}
                  subtitle={getMetricSubtitle('operational efficiency')}
                  icon={AlertTriangle}
                  variant="blue"
                  delay={0.1}
                />
                <div className="absolute top-3 right-3 p-1 rounded-full bg-card/50">
                  <Info className="h-3 w-3 text-subtle-foreground hover:text-muted-foreground transition-colors" />
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent 
              className="max-w-sm bg-popover border border-white/[0.12] text-foreground z-50 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
              side="top"
              align="center"
              sideOffset={8}
            >
              <p className="text-sm">Percentage of confirmed appointments where customers didn't show up {periodText}. Lower rates indicate better customer commitment and booking policies.</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="relative"
              >
                <MetricCard
                  title="Cancellation Rate"
                  value={`${performance?.cancellation_rate?.toFixed(1) || '0.0'}%`}
                  subtitle={getMetricSubtitle('booking reliability')}
                  icon={XCircle}
                  variant="blue"
                  delay={0.2}
                />
                <div className="absolute top-3 right-3 p-1 rounded-full bg-card/50">
                  <Info className="h-3 w-3 text-subtle-foreground hover:text-muted-foreground transition-colors" />
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent 
              className="max-w-sm bg-popover border border-white/[0.12] text-foreground z-50 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
              side="top"
              align="center"
              sideOffset={8}
            >
              <p className="text-sm">Percentage of appointments that were cancelled by customers {periodText}. Tracks booking reliability and customer behavior patterns.</p>
            </TooltipContent>
          </Tooltip>

          {/* Customer Satisfaction - Only for Enterprise users */}
          {accessControl.canAccessCustomerSatisfaction && (
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                  className="relative"
                >
                  <MetricCard
                    title="Customer Satisfaction"
                    value={performance?.customer_satisfaction_score != null ? `${performance.customer_satisfaction_score.toFixed(1)}/5` : '—'}
                    subtitle={getMetricSubtitle('service quality')}
                    icon={Star}
                    variant="blue"
                    delay={0.3}
                  />
                  <div className="absolute top-3 right-3 p-1 rounded-full bg-card/50">
                    <Info className="h-3 w-3 text-subtle-foreground hover:text-muted-foreground transition-colors" />
                  </div>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent 
                className="max-w-sm bg-popover border border-white/[0.12] text-foreground z-50 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
                side="top"
                align="center"
                sideOffset={8}
              >
                <p className="text-sm">Average customer rating based on post-appointment feedback and reviews {periodText}. Scale of 1-5 stars measuring service quality.</p>
              </TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: accessControl.canAccessCustomerSatisfaction ? 0.4 : 0.3 }}
                className="relative"
              >
                <MetricCard
                  title="Confirmed Share"
                  value={`${performance?.booking_completion_rate?.toFixed(1) || '0.0'}%`}
                  subtitle={getMetricSubtitle('of all bookings')}
                  icon={CheckCircle}
                  variant="blue"
                  delay={accessControl.canAccessCustomerSatisfaction ? 0.4 : 0.3}
                />
                <div className="absolute top-3 right-3 p-1 rounded-full bg-card/50">
                  <Info className="h-3 w-3 text-subtle-foreground hover:text-muted-foreground transition-colors" />
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent 
              className="max-w-sm bg-popover border border-white/[0.12] text-foreground z-50 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
              side="top"
              align="center"
              sideOffset={8}
            >
              <p className="text-sm">Share of all bookings {periodText} that are confirmed (versus cancelled or no-show).</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Customer Metrics - Second Row - Mobile optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
                className="relative"
              >
                <MetricCard
                  title="New Customers"
                  value={String(performance?.unique_customers || 0)}
                  subtitle={getMetricSubtitle('customers')}
                  icon={Users}
                  variant="blue"
                  delay={0.5}
                />
                <div className="absolute top-3 right-3 p-1 rounded-full bg-card/50">
                  <Info className="h-3 w-3 text-subtle-foreground hover:text-muted-foreground transition-colors" />
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent 
              className="max-w-sm bg-popover border border-white/[0.12] text-foreground z-50 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
              side="top"
              align="center"
              sideOffset={8}
            >
              <p className="text-sm">Number of new customers who made their first booking {periodText}. Tracks customer acquisition and business reach.</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.6 }}
                className="relative"
              >
                <MetricCard
                  title="Returning Customers"
                  value={String(performance?.returning_customers || 0)}
                  subtitle={getMetricSubtitle('returning')}
                  icon={UserCheck}
                  variant="blue"
                  delay={0.6}
                />
                <div className="absolute top-3 right-3 p-1 rounded-full bg-card/50">
                  <Info className="h-3 w-3 text-subtle-foreground hover:text-muted-foreground transition-colors" />
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent 
              className="max-w-sm bg-popover border border-white/[0.12] text-foreground z-50 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
              side="top"
              align="center"
              sideOffset={8}
            >
              <p className="text-sm">Number of customers who made multiple appointments {periodText}. Indicates customer retention and satisfaction with your services.</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.7 }}
                className="relative"
              >
                <MetricCard
                  title="Total Customers"
                  value={String(performance?.total_customers || 0)}
                  subtitle={getMetricSubtitle('customers')}
                  icon={User}
                  variant="blue"
                  delay={0.7}
                />
                <div className="absolute top-3 right-3 p-1 rounded-full bg-card/50">
                  <Info className="h-3 w-3 text-subtle-foreground hover:text-muted-foreground transition-colors" />
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent 
              className="max-w-sm bg-popover border border-white/[0.12] text-foreground z-50 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
              side="top"
              align="center"
              sideOffset={8}
            >
              <p className="text-sm">Total number of unique customers who made appointments {periodText}. Shows your customer base size for the selected period.</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Enhanced Peak Hours Chart - Mobile optimized */}
        <div className="relative group">
          <div className="relative surface-raised rounded-xl md:rounded-2xl">
            <div className="p-4 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-muted/40 rounded-xl">
                  <Activity className="h-6 w-6 text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    Peak Hours Analysis
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help p-1 rounded-full bg-card/50">
                          <Info className="h-3 w-3 text-subtle-foreground hover:text-muted-foreground transition-colors" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent 
                        className="max-w-sm bg-popover border border-white/[0.12] text-foreground z-50 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
                        side="top"
                        align="center"
                        sideOffset={8}
                      >
                        <p className="text-sm">Visual breakdown of appointment volume throughout the day {periodText}, showing busy periods and quiet times. Helps optimize scheduling.</p>
                      </TooltipContent>
                    </Tooltip>
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">{dateRange.label}</p>
                </div>
              </div>
              
              <PeakHoursChart 
                data={performance?.peak_hours} 
                isLoading={isLoading}
                periodLabel={dateRange.label}
              />
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
