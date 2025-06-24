
import React from 'react';
import { useOptimizedBusinessIntelligence } from '@/hooks/dashboard/useOptimizedBusinessIntelligence';
import { useRealtimeSubscription } from '@/hooks/dashboard/useRealtimeSubscription';
import { TrendingUp, Euro, Users, BarChart3 } from 'lucide-react';
import { BusinessIntelligenceLoading } from './business-intelligence/BusinessIntelligenceLoading';
import { MetricCard } from './business-intelligence/MetricCard';
import { ServicePerformanceChart } from './business-intelligence/ServicePerformanceChart';

interface BusinessIntelligenceTabProps {
  calendarId: string;
}

export function BusinessIntelligenceTab({ calendarId }: BusinessIntelligenceTabProps) {
  const { data: businessIntel, isLoading, error } = useOptimizedBusinessIntelligence(calendarId);
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

  const revenueChange = businessIntel && businessIntel.prev_month_revenue > 0 
    ? ((businessIntel.month_revenue - businessIntel.prev_month_revenue) / businessIntel.prev_month_revenue * 100)
    : 0;

  const isRevenueUp = revenueChange > 0;

  return (
    <div className="space-y-12">
      {/* Financial & Business Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <MetricCard
          title="Maand Omzet"
          value={`€${businessIntel?.month_revenue?.toFixed(2) || '0.00'}`}
          subtitle=""
          icon={Euro}
          variant="green"
          delay={0.1}
          change={{
            value: revenueChange,
            isPositive: isRevenueUp,
            icon: TrendingUp
          }}
        />

        <MetricCard
          title="Unieke Klanten"
          value={String(businessIntel?.unique_customers_month || 0)}
          subtitle="deze maand"
          icon={Users}
          variant="blue"
          delay={0.2}
        />

        <MetricCard
          title="Gemiddelde Waarde"
          value={`€${businessIntel?.avg_booking_value?.toFixed(2) || '0.00'}`}
          subtitle="per afspraak"
          icon={Euro}
          variant="green"
          delay={0.3}
        />

        <MetricCard
          title="Vorige Maand"
          value={`€${businessIntel?.prev_month_revenue?.toFixed(2) || '0.00'}`}
          subtitle="omzet vergelijking"
          icon={BarChart3}
          variant="blue"
          delay={0.4}
        />
      </div>

      {/* Service Performance Chart */}
      <ServicePerformanceChart data={businessIntel?.service_performance} />
    </div>
  );
}
