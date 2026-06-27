
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOptimizedBusinessIntelligence } from '@/hooks/dashboard/useOptimizedBusinessIntelligence';
import { useRealtimeSubscription } from '@/hooks/dashboard/useRealtimeSubscription';
import { TrendingUp, Euro, BarChart3, Calendar, PiggyBank, Info } from 'lucide-react';
import { BusinessIntelligenceLoading } from './business-intelligence/BusinessIntelligenceLoading';
import { MetricCard } from './business-intelligence/MetricCard';
import { ServicePerformanceChart } from './business-intelligence/ServicePerformanceChart';
import { DateRange, rangeLabel } from '@/components/dashboard/DateRangeFilter';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';

interface BusinessIntelligenceTabProps {
  calendarIds: string[];
  dateRange: DateRange;
}

// Helper function to generate dynamic period text for tooltips. Takes `t` so the
// returned phrase is localized; the `preset` switch stays on the stable sentinel.
const getDynamicPeriodText = (dateRange: DateRange, t: (k: string, d: string) => string): string => {
  if (!dateRange) return t('dashboard.bi.period.selected', 'in the selected period');

  switch (dateRange.preset) {
    case 'last7days':
      return t('dashboard.bi.period.last7', 'in the last 7 days');
    case 'last30days':
      return t('dashboard.bi.period.last30', 'in the last 30 days');
    case 'last3months':
      return t('dashboard.bi.period.last3months', 'in the last 3 months');
    case 'lastyear':
      return t('dashboard.bi.period.lastyear', 'in the last year');
    case 'custom':
      return t('dashboard.bi.period.selected', 'in the selected period');
    default:
      return t('dashboard.bi.period.selected', 'in the selected period');
  }
};

export function BusinessIntelligenceTab({ calendarIds, dateRange }: BusinessIntelligenceTabProps) {
  const { t } = useTranslation('dashboard');
  const { data: businessIntel, isLoading, error } = useOptimizedBusinessIntelligence(
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
    return <BusinessIntelligenceLoading />;
  }

  if (isLoading) {
    return <BusinessIntelligenceLoading />;
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-destructive-foreground mb-2">{t('dashboard.bi.err.title', 'Error loading business intelligence data')}</p>
        <p className="text-sm text-muted-foreground">{t('dashboard.bi.err.desc', 'Please try refreshing the page')}</p>
      </div>
    );
  }

  const revenueChange = businessIntel && businessIntel.prev_period_revenue > 0 
    ? ((businessIntel.current_period_revenue - businessIntel.prev_period_revenue) / businessIntel.prev_period_revenue * 100)
    : 0;

  const isRevenueUp = revenueChange > 0;

  // Create dynamic labels based on date range (localized; preset stays the stable sentinel)
  const getMetricSubtitle = (baseText: string) => {
    const label = rangeLabel(dateRange, t);
    return dateRange.preset === 'custom' ? label : label.toLowerCase();
  };

  // Get dynamic period text for tooltips
  const periodText = getDynamicPeriodText(dateRange, t);

  return (
    <TooltipProvider>
      <div className="space-y-4 md:space-y-12">
        {/* Financial & Business Metrics - mono-accent - Mobile optimized */}
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
                  title={t('dashboard.bi.metric.revenue', 'Revenue')}
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
                <div className="absolute top-3 right-3 p-1 rounded-full bg-card/50 backdrop-blur-sm">
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
              <p className="text-sm">{t('dashboard.bi.tip.revenue', 'Total booked revenue across all appointments {{period}}, including upcoming and confirmed bookings (not only completed ones). This includes all services and represents your gross business income through the booking system.', { period: periodText })}</p>
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
                  title={t('dashboard.bi.metric.revenuePerDay', 'Revenue per Day')}
                  value={`€${businessIntel?.revenue_per_day?.toFixed(2) || '0.00'}`}
                  subtitle={getMetricSubtitle('daily average')}
                  icon={Calendar}
                  variant="orange"
                  delay={0.3}
                />
                <div className="absolute top-3 right-3 p-1 rounded-full bg-card/50 backdrop-blur-sm">
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
              <p className="text-sm">{t('dashboard.bi.tip.revenuePerDay', 'Average daily revenue during the selected period {{period}}. Helps track consistent income flow and plan daily business operations.', { period: periodText })}</p>
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
                  title={t('dashboard.bi.metric.avgValue', 'Average Value')}
                  value={`€${businessIntel?.avg_booking_value?.toFixed(2) || '0.00'}`}
                  subtitle={getMetricSubtitle('per appointment')}
                  icon={PiggyBank}
                  variant="orange"
                  delay={0.4}
                />
                <div className="absolute top-3 right-3 p-1 rounded-full bg-card/50 backdrop-blur-sm">
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
              <p className="text-sm">{t('dashboard.bi.tip.avgValue', 'Average revenue per appointment across all services {{period}}. Higher values indicate premium pricing or successful upselling strategies.', { period: periodText })}</p>
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
