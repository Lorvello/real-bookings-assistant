
import React from 'react';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useOptimizedLiveOperations } from '@/hooks/dashboard/useOptimizedLiveOperations';
import { useOptimizedBusinessIntelligence } from '@/hooks/dashboard/useOptimizedBusinessIntelligence';
import { useOptimizedPerformanceEfficiency } from '@/hooks/dashboard/useOptimizedPerformanceEfficiency';
import { MetricCard } from './business-intelligence/MetricCard';
import { DateRange } from '@/components/dashboard/DateRangeFilter';
import { Clock, Euro, TrendingUp, Users, Calendar, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface OverviewTabProps {
  calendarIds: string[];
  dateRange: DateRange;
}

export function OverviewTab({ calendarIds, dateRange }: OverviewTabProps) {
  // Get current data
  const { data: liveOps, isLoading: liveLoading } = useOptimizedLiveOperations(calendarIds);
  const { data: businessData, isLoading: businessLoading } = useOptimizedBusinessIntelligence(
    calendarIds,
    dateRange?.startDate,
    dateRange?.endDate
  );
  const { data: performanceData, isLoading: performanceLoading } = useOptimizedPerformanceEfficiency(
    calendarIds,
    dateRange?.startDate,
    dateRange?.endDate
  );

  const isLoading = liveLoading || businessLoading || performanceLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div 
            key={i} 
            className="h-44 bg-gradient-to-br from-slate-800/40 to-slate-900/60 rounded-2xl animate-pulse border border-slate-700/30"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {/* Today's Bookings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <MetricCard
          title="Today's Bookings"
          value={String(liveOps?.today_bookings || 0)}
          subtitle="confirmed appointments"
          icon={Calendar}
          variant="blue"
          delay={0.1}
        />
      </motion.div>

      {/* Active Now */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <MetricCard
          title="Active Now"
          value={String(liveOps?.active_appointments || 0)}
          subtitle="appointments in progress"
          icon={Clock}
          variant="green"
          delay={0.2}
        />
      </motion.div>

      {/* Period Revenue */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <MetricCard
          title="Period Revenue"
          value={`€${businessData?.current_period_revenue?.toFixed(0) || '0'}`}
          subtitle={dateRange?.label?.toLowerCase() || 'selected period'}
          icon={Euro}
          variant="purple"
          delay={0.3}
        />
      </motion.div>

      {/* Growth Rate */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <MetricCard
          title="Growth Rate"
          value={`${businessData?.monthly_growth >= 0 ? '+' : ''}${businessData?.monthly_growth?.toFixed(1) || '0.0'}%`}
          subtitle="vs previous period"
          icon={TrendingUp}
          variant="blue"
          delay={0.4}
        />
      </motion.div>

      {/* Total Customers */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <MetricCard
          title="Total Customers"
          value={String(performanceData?.total_customers || 0)}
          subtitle={dateRange?.label?.toLowerCase() || 'selected period'}
          icon={Users}
          variant="green"
          delay={0.5}
        />
      </motion.div>

      {/* Booking Success Rate */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.6 }}
      >
        <MetricCard
          title="Success Rate"
          value={`${performanceData?.booking_completion_rate?.toFixed(1) || '0.0'}%`}
          subtitle="booking completion"
          icon={CheckCircle}
          variant="purple"
          delay={0.6}
        />
      </motion.div>
    </div>
  );
}
