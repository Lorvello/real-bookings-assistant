import React from 'react';
import { useOptimizedBusinessIntelligence } from '@/hooks/dashboard/useOptimizedBusinessIntelligence';
import { useRealtimeSubscription } from '@/hooks/dashboard/useRealtimeSubscription';
import { TrendingUp, Euro, Users, BarChart3 } from 'lucide-react';
import { BusinessIntelligenceLoading } from './business-intelligence/BusinessIntelligenceLoading';
import { MetricCard } from './business-intelligence/MetricCard';
import { ServicePerformanceChart } from './business-intelligence/ServicePerformanceChart';
import { DateRange } from '@/components/dashboard/DateRangeFilter';

interface BusinessIntelligenceTabProps {
  calendarId: string;
  dateRange: DateRange;
}

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

  return (
    <div className="space-y-12">
      {/* Financial & Business Metrics - Orange Theme */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

        <MetricCard
          title="Unique Customers"
          value={String(businessIntel?.unique_customers || 0)}
          subtitle={getMetricSubtitle('customers')}
          icon={Users}
          variant="orange"
          delay={0.2}
        />

        <MetricCard
          title="Average Value"
          value={`€${businessIntel?.avg_booking_value?.toFixed(2) || '0.00'}`}
          subtitle="per appointment"
          icon={Euro}
          variant="orange"
          delay={0.3}
        />

        <MetricCard
          title="Previous Period"
          value={`€${businessIntel?.prev_period_revenue?.toFixed(2) || '0.00'}`}
          subtitle="comparison"
          icon={BarChart3}
          variant="orange"
          delay={0.4}
        />
      </div>

      {/* Service Performance Chart - Orange Glow Only */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/20 via-amber-500/15 to-orange-500/20 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-orange-500/30 rounded-2xl shadow-2xl">
          <ServicePerformanceChart data={businessIntel?.service_performance} />
        </div>
      </div>
    </div>
  );
}
