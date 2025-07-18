import React from 'react';
import { useOptimizedBusinessIntelligence } from '@/hooks/dashboard/useOptimizedBusinessIntelligence';
import { useRealtimeSubscription } from '@/hooks/dashboard/useRealtimeSubscription';
import { TrendingUp, TrendingDown, Euro, Users, BarChart3, Target, DollarSign, UserCheck, RotateCcw, Percent, MessageSquare, PieChart } from 'lucide-react';
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
      {/* Primary KPIs - Premium Enterprise Row */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-200 mb-6">Primary Business KPIs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Customer Lifetime Value"
            value={`€${businessIntel?.customer_lifetime_value?.toFixed(2) || '0.00'}`}
            subtitle="CLV with growth"
            icon={Target}
            variant="blue"
            delay={0.1}
            change={{
              value: businessIntel?.clv_trend || 0,
              isPositive: (businessIntel?.clv_trend || 0) > 0,
              icon: (businessIntel?.clv_trend || 0) > 0 ? TrendingUp : TrendingDown
            }}
          />

          <MetricCard
            title="Monthly Recurring Revenue"
            value={`€${businessIntel?.monthly_recurring_revenue?.toFixed(2) || '0.00'}`}
            subtitle="MRR growth"
            icon={DollarSign}
            variant="green"
            delay={0.2}
            change={{
              value: businessIntel?.mrr_growth || 0,
              isPositive: (businessIntel?.mrr_growth || 0) > 0,
              icon: (businessIntel?.mrr_growth || 0) > 0 ? TrendingUp : TrendingDown
            }}
          />

          <MetricCard
            title="Customer Acquisition Cost"
            value={`€${businessIntel?.customer_acquisition_cost?.toFixed(2) || '0.00'}`}
            subtitle={`Efficiency: ${businessIntel?.cac_efficiency?.toFixed(1) || '0.0'}x`}
            icon={UserCheck}
            variant="purple"
            delay={0.3}
          />

          <MetricCard
            title="Churn Rate"
            value={`${businessIntel?.churn_rate?.toFixed(1) || '0.0'}%`}
            subtitle={`Retention: ${businessIntel?.retention_rate?.toFixed(1) || '0.0'}%`}
            icon={RotateCcw}
            variant="orange"
            delay={0.4}
            change={{
              value: -(businessIntel?.churn_rate || 0),
              isPositive: (businessIntel?.churn_rate || 0) < 15,
              icon: (businessIntel?.churn_rate || 0) < 15 ? TrendingUp : TrendingDown
            }}
          />
        </div>
      </div>

      {/* Secondary Enterprise Metrics */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-200 mb-6">Advanced Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <MetricCard
            title="Revenue Growth"
            value={`${businessIntel?.revenue_growth_rate?.toFixed(1) || '0.0'}%`}
            subtitle="month-over-month"
            icon={TrendingUp}
            variant="green"
            delay={0.5}
            change={{
              value: businessIntel?.revenue_growth_rate || 0,
              isPositive: (businessIntel?.revenue_growth_rate || 0) > 0,
              icon: (businessIntel?.revenue_growth_rate || 0) > 0 ? TrendingUp : TrendingDown
            }}
          />

          <MetricCard
            title="Profit Margin"
            value={`${businessIntel?.profit_margin?.toFixed(1) || '0.0'}%`}
            subtitle="overall margin"
            icon={Percent}
            variant="blue"
            delay={0.6}
          />

          <MetricCard
            title="WhatsApp Attribution"
            value={`${businessIntel?.whatsapp_attribution?.toFixed(1) || '0.0'}%`}
            subtitle="of total bookings"
            icon={MessageSquare}
            variant="purple"
            delay={0.7}
          />

          <MetricCard
            title="Average Booking Value"
            value={`€${businessIntel?.avg_booking_value?.toFixed(2) || '0.00'}`}
            subtitle="vs previous period"
            icon={Euro}
            variant="orange"
            delay={0.8}
            change={{
              value: revenueChange,
              isPositive: isRevenueUp,
              icon: isRevenueUp ? TrendingUp : TrendingDown
            }}
          />

          <MetricCard
            title="Total Revenue"
            value={`€${businessIntel?.current_period_revenue?.toFixed(2) || '0.00'}`}
            subtitle={getMetricSubtitle('revenue')}
            icon={BarChart3}
            variant="green"
            delay={0.9}
          />
        </div>
      </div>

      {/* Service Performance Chart - Enhanced with Profit Margins */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/20 via-amber-500/15 to-orange-500/20 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-orange-500/30 rounded-2xl shadow-2xl">
          <ServicePerformanceChart data={businessIntel?.service_performance} />
        </div>
      </div>
    </div>
  );
}
