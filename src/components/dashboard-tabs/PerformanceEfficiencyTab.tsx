
import React from 'react';
import { useOptimizedPerformanceEfficiency } from '@/hooks/dashboard/useOptimizedPerformanceEfficiency';
import { useRealtimeSubscription } from '@/hooks/dashboard/useRealtimeSubscription';
import { AlertTriangle, XCircle, Star, CheckCircle, Activity, Info } from 'lucide-react';
import { MetricCard } from './business-intelligence/MetricCard';
import { PeakHoursChart } from './performance/PeakHoursChart';
import { DateRange } from '@/components/dashboard/DateRangeFilter';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';

interface PerformanceEfficiencyTabProps {
  calendarId: string;
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

export function PerformanceEfficiencyTab({ calendarId, dateRange }: PerformanceEfficiencyTabProps) {
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
    calendarId,
    dateRange.startDate,
    dateRange.endDate
  );
  useRealtimeSubscription(calendarId);

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
      <div className="space-y-12">
        {/* Operational Performance Metrics - Blue Theme */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                <div className="absolute top-3 right-3 p-1 rounded-full bg-slate-800/50 backdrop-blur-sm">
                  <Info className="h-3 w-3 text-blue-400/70 hover:text-blue-300 transition-colors" />
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
                  title="Cancellation Rate"
                  value={`${performance?.cancellation_rate?.toFixed(1) || '0.0'}%`}
                  subtitle={getMetricSubtitle('booking reliability')}
                  icon={XCircle}
                  variant="blue"
                  delay={0.2}
                />
                <div className="absolute top-3 right-3 p-1 rounded-full bg-slate-800/50 backdrop-blur-sm">
                  <Info className="h-3 w-3 text-blue-400/70 hover:text-blue-300 transition-colors" />
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
                  value={`${performance?.customer_satisfaction_score?.toFixed(1) || '0.0'}/5`}
                  subtitle={getMetricSubtitle('service quality')}
                  icon={Star}
                  variant="blue"
                  delay={0.3}
                />
                <div className="absolute top-3 right-3 p-1 rounded-full bg-slate-800/50 backdrop-blur-sm">
                  <Info className="h-3 w-3 text-blue-400/70 hover:text-blue-300 transition-colors" />
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

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className="relative"
              >
                <MetricCard
                  title="Booking Completion"
                  value={`${performance?.booking_completion_rate?.toFixed(1) || '0.0'}%`}
                  subtitle={getMetricSubtitle('success rate')}
                  icon={CheckCircle}
                  variant="blue"
                  delay={0.4}
                />
                <div className="absolute top-3 right-3 p-1 rounded-full bg-slate-800/50 backdrop-blur-sm">
                  <Info className="h-3 w-3 text-blue-400/70 hover:text-blue-300 transition-colors" />
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

        {/* Enhanced Peak Hours Chart */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-cyan-500/15 to-blue-500/20 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-blue-500/30 rounded-2xl shadow-2xl">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl">
                  <Activity className="h-6 w-6 text-blue-400" />
                </div>
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
                      <p className="text-sm">Visual breakdown of appointment volume throughout the day {periodText}, showing busy periods in red/orange and quiet times in green. Helps optimize scheduling.</p>
                    </TooltipContent>
                  </Tooltip>
                </h3>
              </div>
              
              <PeakHoursChart 
                data={performance?.peak_hours} 
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
