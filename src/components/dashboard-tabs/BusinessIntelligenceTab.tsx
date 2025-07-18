
import React from 'react';
import { useOptimizedBusinessIntelligence } from '@/hooks/dashboard/useOptimizedBusinessIntelligence';
import { useRealtimeSubscription } from '@/hooks/dashboard/useRealtimeSubscription';
import { TrendingUp, Euro, BarChart3, Calendar, PiggyBank, Info } from 'lucide-react';
import { BusinessIntelligenceLoading } from './business-intelligence/BusinessIntelligenceLoading';
import { MetricCard } from './business-intelligence/MetricCard';
import { ServicePerformanceChart } from './business-intelligence/ServicePerformanceChart';
import { DateRange } from '@/components/dashboard/DateRangeFilter';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';

interface BusinessIntelligenceTabProps {
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

export function BusinessIntelligenceTab({ calendarId, dateRange }: BusinessIntelligenceTabProps) {
  // Add safety check for dateRange
  if (!dateRange || !dateRange.startDate || !dateRange.endDate) {
    return <BusinessIntelligenceLoading />;
  }

  const { data: businessIntel, isLoading, error } = useOptimizedBusinessIntelligence(
    calendarId, 
    dateRange.startDate, 
    dateRange.endDate
  );
  useRealtimeSubscription(calendarId);

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
                  subtitle="per appointment"
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

        {/* Service Performance Chart - Orange Glow Only */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/20 via-amber-500/15 to-orange-500/20 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-orange-500/30 rounded-2xl shadow-2xl">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-xl">
                  <BarChart3 className="h-6 w-6 text-orange-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  Service Performance
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help p-1 rounded-full bg-slate-800/50 backdrop-blur-sm">
                        <Info className="h-3 w-3 text-orange-400/70 hover:text-orange-300 transition-colors" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent 
                      className="max-w-sm bg-slate-900/95 border border-orange-500/30 text-slate-100 z-50"
                      side="top"
                      align="center"
                      sideOffset={8}
                    >
                      <p className="text-sm">Compares booking volume (blue) and revenue (green) for each service {periodText}. Helps identify most profitable services and optimize your service portfolio.</p>
                    </TooltipContent>
                  </Tooltip>
                </h3>
              </div>
              <ServicePerformanceChart data={businessIntel?.service_performance} />
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
