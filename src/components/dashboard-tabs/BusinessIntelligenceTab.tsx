import React from 'react';
import { useOptimizedBusinessIntelligence } from '@/hooks/dashboard/useOptimizedBusinessIntelligence';
import { useRealtimeSubscription } from '@/hooks/dashboard/useRealtimeSubscription';
import { TrendingUp, Euro, BarChart3, Calendar, PiggyBank, Info } from 'lucide-react';
import { BusinessIntelligenceLoading } from './business-intelligence/BusinessIntelligenceLoading';
import { MetricCard } from './business-intelligence/MetricCard';
import { ServicePerformanceChart } from './business-intelligence/ServicePerformanceChart';
import { DateRange } from '@/components/dashboard/DateRangeFilter';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface BusinessIntelligenceTabProps {
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

export function BusinessIntelligenceTab({ calendarIds, dateRange }: BusinessIntelligenceTabProps) {
  // Add safety check for dateRange
  if (!dateRange || !dateRange.startDate || !dateRange.endDate) {
    return <BusinessIntelligenceLoading />;
  }

  // For now, use the first calendar ID - in the future this should aggregate across all calendars
  const primaryCalendarId = calendarIds.length > 0 ? calendarIds[0] : '';
  
  const { data: businessIntel, isLoading, error } = useOptimizedBusinessIntelligence(
    primaryCalendarId, 
    dateRange.startDate, 
    dateRange.endDate
  );
  useRealtimeSubscription(primaryCalendarId);

  if (isLoading) {
    return <BusinessIntelligenceLoading />;
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-400 mb-2">Error loading business intelligence data</p>
        <p className="text-sm text-slate-400">Please try refreshing the page</p>
      </div>
    );
  }

  const revenueChange = businessIntel && businessIntel.prev_period_revenue > 0 
    ? ((businessIntel.current_period_revenue - businessIntel.prev_period_revenue) / businessIntel.prev_period_revenue * 100)
    : 0;

  const isRevenueUp = revenueChange > 0;

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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Business Intelligence</h2>
            <p className="text-slate-400 mt-1">Financial metrics and performance analytics</p>
          </div>
          {calendarIds.length > 1 && (
            <Badge variant="secondary" className="bg-orange-600/20 text-orange-300 border-orange-500/30">
              {calendarIds.length} calendars • Primary view
            </Badge>
          )}
        </div>

        {/* Financial & Business Metrics - Orange Theme */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="relative"
              >
                <MetricCard
                  title="Revenue"
                  value={`€${businessIntel?.current_period_revenue?.toFixed(2) || '0.00'}`}
                  subtitle={getMetricSubtitle('revenue')}
                  icon={Euro}
                  variant="orange"
                  delay={0.1}
                  change={{
                    value: revenueChange,
                    isPositive: isRevenueUp,
                    icon: TrendingUp
                  }}
                />
                <div className="absolute top-3 right-3 p-1 rounded-full bg-slate-800/50 backdrop-blur-sm">
                  <Info className="h-3 w-3 text-orange-400/70 hover:text-orange-300 transition-colors" />
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent 
              className="max-w-sm bg-slate-900/95 border border-orange-500/30 text-slate-100 z-50"
              side="top"
              align="center"
              sideOffset={8}
            >
              <p className="text-sm">Total money earned from all completed appointments {periodText}. This includes all services and represents your gross business income through the booking system.</p>
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
                  title="Monthly Growth"
                  value={`${businessIntel?.monthly_growth >= 0 ? '+' : ''}${businessIntel?.monthly_growth?.toFixed(1) || '0.0'}%`}
                  subtitle={getMetricSubtitle('growth')}
                  icon={TrendingUp}
                  variant="orange"
                  delay={0.2}
                />
                <div className="absolute top-3 right-3 p-1 rounded-full bg-slate-800/50 backdrop-blur-sm">
                  <Info className="h-3 w-3 text-orange-400/70 hover:text-orange-300 transition-colors" />
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent 
              className="max-w-sm bg-slate-900/95 border border-orange-500/30 text-slate-100 z-50"
              side="top"
              align="center"
              sideOffset={8}
            >
              <p className="text-sm">Revenue growth percentage compared to the previous period {periodText}. Positive values indicate business expansion and improved financial performance.</p>
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
                  title="Revenue per Day"
                  value={`€${businessIntel?.revenue_per_day?.toFixed(2) || '0.00'}`}
                  subtitle={getMetricSubtitle('daily average')}
                  icon={Calendar}
                  variant="orange"
                  delay={0.3}
                />
                <div className="absolute top-3 right-3 p-1 rounded-full bg-slate-800/50 backdrop-blur-sm">
                  <Info className="h-3 w-3 text-orange-400/70 hover:text-orange-300 transition-colors" />
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent 
              className="max-w-sm bg-slate-900/95 border border-orange-500/30 text-slate-100 z-50"
              side="top"
              align="center"
              sideOffset={8}
            >
              <p className="text-sm">Average daily revenue during the selected period {periodText}. Helps track consistent income flow and plan daily business operations.</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="relative"
              >
                <MetricCard
                  title="Average Value"
                  value={`€${businessIntel?.avg_booking_value?.toFixed(2) || '0.00'}`}
                  subtitle={getMetricSubtitle('per appointment')}
                  icon={PiggyBank}
                  variant="orange"
                  delay={0.4}
                />
                <div className="absolute top-3 right-3 p-1 rounded-full bg-slate-800/50 backdrop-blur-sm">
                  <Info className="h-3 w-3 text-orange-400/70 hover:text-orange-300 transition-colors" />
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent 
              className="max-w-sm bg-slate-900/95 border border-orange-500/30 text-slate-100 z-50"
              side="top"
              align="center"
              sideOffset={8}
            >
              <p className="text-sm">Average revenue per appointment across all services {periodText}. Higher values indicate premium pricing or successful upselling strategies.</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Service Performance Chart */}
        <div className="animate-fade-in">
          <ServicePerformanceChart data={businessIntel?.service_performance} selectedTimeRange={getMetricSubtitle('service performance')} />
        </div>
      </div>
    </TooltipProvider>
  );
}
