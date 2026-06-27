import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOptimizedPerformanceEfficiency } from '@/hooks/dashboard/useOptimizedPerformanceEfficiency';
import { useRealtimeSubscription } from '@/hooks/dashboard/useRealtimeSubscription';
import { AlertTriangle, XCircle, CheckCircle, Activity, Info, Users, UserCheck, User } from 'lucide-react';
import { MetricCard } from './business-intelligence/MetricCard';
import { PeakHoursChart } from './performance/PeakHoursChart';
import { DateRange } from '@/components/dashboard/DateRangeFilter';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';

interface PerformanceEfficiencyTabProps {
  calendarIds: string[];
  dateRange: DateRange;
}

// Helper function to generate dynamic period text for tooltips. Takes `t` so the
// returned phrase is localized; reuses the BI period keys (identical phrases).
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

export function PerformanceEfficiencyTab({ calendarIds, dateRange }: PerformanceEfficiencyTabProps) {
  const { t } = useTranslation('dashboard');

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
        <p className="text-destructive-foreground mb-2">{t('dashboard.perfEff.errTitle', 'Error loading performance data')}</p>
        <p className="text-sm text-muted-foreground">{t('dashboard.perfEff.errDesc', 'Please try refreshing the page')}</p>
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
  const periodText = getDynamicPeriodText(dateRange, t);

  return (
    <TooltipProvider>
      <div className="space-y-4 md:space-y-12">
        {/* Operational Performance Metrics - mono-accent - Mobile optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="relative"
              >
                <MetricCard
                  title={t('dashboard.perfEff.metric.noShowRate', 'No-Show Rate')}
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
              <p className="text-sm">{t('dashboard.perfEff.tip.noShow', "Percentage of confirmed appointments where customers didn't show up {{period}}. Lower rates indicate better customer commitment and booking policies.", { period: periodText })}</p>
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
                  title={t('dashboard.perfEff.metric.cancellationRate', 'Cancellation Rate')}
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
              <p className="text-sm">{t('dashboard.perfEff.tip.cancellation', 'Percentage of appointments that were cancelled by customers {{period}}. Tracks booking reliability and customer behavior patterns.', { period: periodText })}</p>
            </TooltipContent>
          </Tooltip>

          {/* Customer Satisfaction card removed (2026-06-26): there is no review/rating pipeline yet,
              so it rendered a permanent empty placeholder with a tooltip claiming a feature that does
              not exist. Re-add when the automated post-appointment review collection is built (FUTURE_IDEAS). */}

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="relative"
              >
                <MetricCard
                  title={t('dashboard.perfEff.metric.confirmedShare', 'Confirmed Share')}
                  value={`${performance?.booking_completion_rate?.toFixed(1) || '0.0'}%`}
                  subtitle={getMetricSubtitle('of all bookings')}
                  icon={CheckCircle}
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
              <p className="text-sm">{t('dashboard.perfEff.tip.confirmed', 'Share of all bookings {{period}} that are confirmed (versus cancelled or no-show).', { period: periodText })}</p>
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
                  title={t('dashboard.perfEff.metric.newCustomers', 'New Customers')}
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
              <p className="text-sm">{t('dashboard.perfEff.tip.newCustomers', 'Number of new customers who made their first booking {{period}}. Tracks customer acquisition and business reach.', { period: periodText })}</p>
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
                  title={t('dashboard.perfEff.metric.returningCustomers', 'Returning Customers')}
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
              <p className="text-sm">{t('dashboard.perfEff.tip.returning', 'Number of customers who made multiple appointments {{period}}. Indicates customer retention and satisfaction with your services.', { period: periodText })}</p>
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
                  title={t('dashboard.perfEff.metric.totalCustomers', 'Total Customers')}
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
              <p className="text-sm">{t('dashboard.perfEff.tip.totalCustomers', 'Total number of unique customers who made appointments {{period}}. Shows your customer base size for the selected period.', { period: periodText })}</p>
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
                    {t('dashboard.perfEff.peakTitle', 'Peak Hours Analysis')}
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
                        <p className="text-sm">{t('dashboard.perfEff.peakTip', 'Visual breakdown of appointment volume throughout the day {{period}}, showing busy periods and quiet times. Helps optimize scheduling.', { period: periodText })}</p>
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
