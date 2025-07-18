
import React from 'react';
import { useOptimizedPerformanceEfficiency } from '@/hooks/dashboard/useOptimizedPerformanceEfficiency';
import { useOptimizedBusinessIntelligence } from '@/hooks/dashboard/useOptimizedBusinessIntelligence';
import { useRealtimeSubscription } from '@/hooks/dashboard/useRealtimeSubscription';
import { CheckCircle, AlertTriangle, Euro, Activity, MessageSquare } from 'lucide-react';
import { MetricCard } from './business-intelligence/MetricCard';
import { PeakHoursChart } from './performance/PeakHoursChart';
import { DateRange } from '@/components/dashboard/DateRangeFilter';

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
  const { data: businessIntel, isLoading: businessLoading, error: businessError } = useOptimizedBusinessIntelligence(
    calendarId,
    dateRange.startDate,
    dateRange.endDate
  );
  useRealtimeSubscription(calendarId);

  const isLoading = performanceLoading || businessLoading;
  const error = performanceError || businessError;

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
    <div className="space-y-12">
      {/* Operational Performance Metrics - Blue Theme */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Booking Efficiency"
          value={`${performance?.booking_efficiency?.toFixed(1) || '0.0'}%`}
          subtitle="successful bookings"
          icon={CheckCircle}
          variant="blue"
          delay={0.1}
        />

        <MetricCard
          title="No-show Rate"
          value={`${performance?.no_show_rate?.toFixed(1) || '0.0'}%`}
          subtitle={getMetricSubtitle('period')}
          icon={AlertTriangle}
          variant="blue"
          delay={0.2}
        />

        <MetricCard
          title="Cancellation Rate"
          value={`${performance?.cancellation_rate?.toFixed(1) || '0.0'}%`}
          subtitle={getMetricSubtitle('period')}
          icon={AlertTriangle}
          variant="blue"
          delay={0.3}
        />

        <MetricCard
          title="Revenue per Day"
          value={`€${performance?.avg_revenue_per_day?.toFixed(0) || '0'}`}
          subtitle="average daily"
          icon={Euro}
          variant="blue"
          delay={0.4}
        />
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
              <h3 className="text-xl font-bold text-slate-100">Peak Hours Analysis</h3>
            </div>
            
            <PeakHoursChart 
              data={performance?.peak_hours} 
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>

      {/* WhatsApp Performance Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MetricCard
          title="WhatsApp Conversion"
          value={`${businessIntel?.whatsapp_conversion_rate?.toFixed(1) || '0.0'}%`}
          subtitle="WhatsApp → Booking"
          icon={MessageSquare}
          variant="blue"
          delay={0.5}
        />
      </div>
    </div>
  );
}
