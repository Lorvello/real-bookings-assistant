
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

  return (
    <TooltipProvider>
      <div className="space-y-12">
        {/* Operational Performance Metrics - Blue Theme */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <MetricCard
              title={
                <div className="flex items-center gap-2">
                  <span>No-Show Rate</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">
                        <Info className="h-4 w-4 text-slate-400 hover:text-slate-300 transition-colors" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent 
                      className="max-w-xs bg-slate-900/95 border border-slate-700 text-slate-100 p-3 rounded-lg shadow-xl z-50"
                      sideOffset={5}
                    >
                      <p className="text-sm leading-relaxed">
                        Percentage of confirmed appointments where customers didn't show up in the last 30 days. Lower rates indicate better customer commitment and booking policies.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              }
              value={`${performance?.no_show_rate?.toFixed(1) || '0.0'}%`}
              subtitle={getMetricSubtitle('operational efficiency')}
              icon={AlertTriangle}
              variant="blue"
              delay={0.1}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <MetricCard
              title={
                <div className="flex items-center gap-2">
                  <span>Cancellation Rate</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">
                        <Info className="h-4 w-4 text-slate-400 hover:text-slate-300 transition-colors" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent 
                      className="max-w-xs bg-slate-900/95 border border-slate-700 text-slate-100 p-3 rounded-lg shadow-xl z-50"
                      sideOffset={5}
                    >
                      <p className="text-sm leading-relaxed">
                        Percentage of appointments that were cancelled by customers in the last 30 days. Tracks booking reliability and customer behavior patterns.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              }
              value={`${performance?.cancellation_rate?.toFixed(1) || '0.0'}%`}
              subtitle={getMetricSubtitle('booking reliability')}
              icon={XCircle}
              variant="blue"
              delay={0.2}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <MetricCard
              title={
                <div className="flex items-center gap-2">
                  <span>Customer Satisfaction</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">
                        <Info className="h-4 w-4 text-slate-400 hover:text-slate-300 transition-colors" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent 
                      className="max-w-xs bg-slate-900/95 border border-slate-700 text-slate-100 p-3 rounded-lg shadow-xl z-50"
                      sideOffset={5}
                    >
                      <p className="text-sm leading-relaxed">
                        Average customer rating based on post-appointment feedback and reviews over the last 30 days. Scale of 1-5 stars measuring service quality.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              }
              value={`${performance?.customer_satisfaction_score?.toFixed(1) || '0.0'}/5`}
              subtitle={getMetricSubtitle('service quality')}
              icon={Star}
              variant="blue"
              delay={0.3}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <MetricCard
              title={
                <div className="flex items-center gap-2">
                  <span>Booking Completion</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">
                        <Info className="h-4 w-4 text-slate-400 hover:text-slate-300 transition-colors" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent 
                      className="max-w-xs bg-slate-900/95 border border-slate-700 text-slate-100 p-3 rounded-lg shadow-xl z-50"
                      sideOffset={5}
                    >
                      <p className="text-sm leading-relaxed">
                        Percentage of booking inquiries that successfully resulted in confirmed appointments in the last 30 days. Measures conversion efficiency.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              }
              value={`${performance?.booking_completion_rate?.toFixed(1) || '0.0'}%`}
              subtitle={getMetricSubtitle('success rate')}
              icon={CheckCircle}
              variant="blue"
              delay={0.4}
            />
          </motion.div>
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
                      <div className="cursor-help">
                        <Info className="h-4 w-4 text-slate-400 hover:text-slate-300 transition-colors" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent 
                      className="max-w-xs bg-slate-900/95 border border-slate-700 text-slate-100 p-3 rounded-lg shadow-xl z-50"
                      sideOffset={5}
                    >
                      <p className="text-sm leading-relaxed">
                        Visual breakdown of appointment volume throughout the day, showing busy periods in red/orange and quiet times in green. Helps optimize scheduling.
                      </p>
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
