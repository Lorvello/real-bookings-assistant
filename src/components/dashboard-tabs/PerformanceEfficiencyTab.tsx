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

  // Add safety check for dateRange
  if (!dateRange || !dateRange.startDate || !dateRange.endDate) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              className="h-44 bg-gradient-to-br from-slate-800/40 to-slate-900/60 rounded-2xl animate-pulse border border-slate-700/30"
            />
          ))}
        </div>
        <div className="h-96 bg-gradient-to-br from-slate-800/40 to-slate-900/60 rounded-2xl animate-pulse border border-slate-700/30"></div>
      </div>
    );
  }

  const { data: performance, isLoading: performanceLoading, error: performanceError } = useOptimizedPerformanceEfficiency(
    calendarIds,
    dateRange.startDate,
    dateRange.endDate
  );
  
  // Subscribe to real-time updates for the primary calendar (first in array)
  const primaryCalendarId = calendarIds[0];
  useRealtimeSubscription(primaryCalendarId);

  const isLoading = performanceLoading;
  const error = performanceError;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              className="h-44 bg-gradient-to-br from-slate-800/40 to-slate-900/60 rounded-2xl animate-pulse border border-slate-700/30"
            />
          ))}
        </div>
        <div className="h-96 bg-gradient-to-br from-slate-800/40 to-slate-900/60 rounded-2xl animate-pulse border border-slate-700/30"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-400 mb-2">Error loading performance data</p>
        <p className="text-sm text-slate-400">Please try refreshing the page</p>
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
        {/* Operational Performance Metrics - Blue Theme - Extreme mobile compression */}
        <div className={`grid grid-cols-${accessControl.canAccessCustomerSatisfaction ? '4' : '3'} md:grid-cols-${accessControl.canAccessCustomerSatisfaction ? '4' : '3'} gap-1 md:gap-6`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="relative"
              >
                <MetricCard
                  title="No-Show"
                  value={`${performance?.no_show_rate?.toFixed(1) || '0.0'}%`}
                  subtitle="rate"
                  icon={AlertTriangle}
                  variant="blue"
                  delay={0.1}
                />
                <div className="absolute top-1 right-1 p-0.5 rounded-full bg-slate-800/50 backdrop-blur-sm md:top-3 md:right-3 md:p-1">
                  <Info className="h-2 w-2 md:h-3 md:w-3 text-blue-400/70 hover:text-blue-300 transition-colors" />
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent 
              className="max-w-sm bg-slate-900/95 border border-blue-500/30 text-slate-100 z-50"
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
                  title="Cancel"
                  value={`${performance?.cancellation_rate?.toFixed(1) || '0.0'}%`}
                  subtitle="rate"
                  icon={XCircle}
                  variant="blue"
                  delay={0.2}
                />
                <div className="absolute top-1 right-1 p-0.5 rounded-full bg-slate-800/50 backdrop-blur-sm md:top-3 md:right-3 md:p-1">
                  <Info className="h-2 w-2 md:h-3 md:w-3 text-blue-400/70 hover:text-blue-300 transition-colors" />
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent 
              className="max-w-sm bg-slate-900/95 border border-blue-500/30 text-slate-100 z-50"
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
                    title="Satisfaction"
                    value={`${performance?.customer_satisfaction_score?.toFixed(1) || '0.0'}/5`}
                    subtitle="rating"
                    icon={Star}
                    variant="blue"
                    delay={0.3}
                  />
                  <div className="absolute top-1 right-1 p-0.5 rounded-full bg-slate-800/50 backdrop-blur-sm md:top-3 md:right-3 md:p-1">
                    <Info className="h-2 w-2 md:h-3 md:w-3 text-blue-400/70 hover:text-blue-300 transition-colors" />
                  </div>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent 
                className="max-w-sm bg-slate-900/95 border border-blue-500/30 text-slate-100 z-50"
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
                  title="Complete"
                  value={`${performance?.booking_completion_rate?.toFixed(1) || '0.0'}%`}
                  subtitle="rate"
                  icon={CheckCircle}
                  variant="blue"
                  delay={accessControl.canAccessCustomerSatisfaction ? 0.4 : 0.3}
                />
                <div className="absolute top-1 right-1 p-0.5 rounded-full bg-slate-800/50 backdrop-blur-sm md:top-3 md:right-3 md:p-1">
                  <Info className="h-2 w-2 md:h-3 md:w-3 text-blue-400/70 hover:text-blue-300 transition-colors" />
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent 
              className="max-w-sm bg-slate-900/95 border border-blue-500/30 text-slate-100 z-50"
              side="top"
              align="center"
              sideOffset={8}
            >
              <p className="text-sm">Percentage of booking inquiries that successfully resulted in confirmed appointments {periodText}. Measures conversion efficiency.</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Customer Metrics - Second Row - Extreme mobile compression */}
        <div className="grid grid-cols-3 md:grid-cols-3 gap-1 md:gap-6">
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
                className="relative"
              >
                <MetricCard
                  title="Unique"
                  value={String(performance?.unique_customers || 0)}
                  subtitle="customers"
                  icon={Users}
                  variant="blue"
                  delay={0.5}
                />
                <div className="absolute top-1 right-1 p-0.5 rounded-full bg-slate-800/50 backdrop-blur-sm md:top-3 md:right-3 md:p-1">
                  <Info className="h-2 w-2 md:h-3 md:w-3 text-blue-400/70 hover:text-blue-300 transition-colors" />
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent 
              className="max-w-sm bg-slate-900/95 border border-blue-500/30 text-slate-100 z-50"
              side="top"
              align="center"
              sideOffset={8}
            >
              <p className="text-sm">Number of individual customers who made at least one appointment {periodText}. Tracks customer acquisition and business reach.</p>
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
                  title="Returning"
                  value={String(performance?.returning_customers || 0)}
                  subtitle="customers"
                  icon={UserCheck}
                  variant="blue"
                  delay={0.6}
                />
                <div className="absolute top-1 right-1 p-0.5 rounded-full bg-slate-800/50 backdrop-blur-sm md:top-3 md:right-3 md:p-1">
                  <Info className="h-2 w-2 md:h-3 md:w-3 text-blue-400/70 hover:text-blue-300 transition-colors" />
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent 
              className="max-w-sm bg-slate-900/95 border border-blue-500/30 text-slate-100 z-50"
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
                  title="Total"
                  value={String(performance?.total_customers || 0)}
                  subtitle="customers"
                  icon={User}
                  variant="blue"
                  delay={0.7}
                />
                <div className="absolute top-1 right-1 p-0.5 rounded-full bg-slate-800/50 backdrop-blur-sm md:top-3 md:right-3 md:p-1">
                  <Info className="h-2 w-2 md:h-3 md:w-3 text-blue-400/70 hover:text-blue-300 transition-colors" />
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent 
              className="max-w-sm bg-slate-900/95 border border-blue-500/30 text-slate-100 z-50"
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
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-cyan-500/15 to-blue-500/20 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-blue-500/30 rounded-xl md:rounded-2xl shadow-2xl">
            <div className="p-4 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl">
                  <Activity className="h-6 w-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    Peak Hours Analysis
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help p-1 rounded-full bg-slate-800/50 backdrop-blur-sm">
                          <Info className="h-3 w-3 text-blue-400/70 hover:text-blue-300 transition-colors" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent 
                        className="max-w-sm bg-slate-900/95 border border-blue-500/30 text-slate-100 z-50"
                        side="top"
                        align="center"
                        sideOffset={8}
                      >
                        <p className="text-sm">Visual breakdown of appointment volume throughout the day {periodText}, showing busy periods and quiet times. Helps optimize scheduling.</p>
                      </TooltipContent>
                    </Tooltip>
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">{dateRange.label}</p>
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
