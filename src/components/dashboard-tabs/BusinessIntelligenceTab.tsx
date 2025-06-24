
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
      {/* Financial & Business Metrics - Goud/Oranje Thema */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Maand Omzet"
          value={`€${businessIntel?.month_revenue?.toFixed(2) || '0.00'}`}
          subtitle=""
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
          title="Unieke Klanten"
          value={String(businessIntel?.unique_customers_month || 0)}
          subtitle="deze maand"
          icon={Users}
          variant="orange"
          delay={0.2}
        />

        <MetricCard
          title="Gemiddelde Waarde"
          value={`€${businessIntel?.avg_booking_value?.toFixed(2) || '0.00'}`}
          subtitle="per afspraak"
          icon={Euro}
          variant="orange"
          delay={0.3}
        />

        <MetricCard
          title="Vorige Maand"
          value={`€${businessIntel?.prev_month_revenue?.toFixed(2) || '0.00'}`}
          subtitle="omzet vergelijking"
          icon={BarChart3}
          variant="orange"
          delay={0.4}
        />
      </div>

      {/* Service Performance Chart */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/20 via-amber-500/15 to-orange-500/20 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-orange-500/30 rounded-2xl shadow-2xl">
          <ServicePerformanceChart data={businessIntel?.service_performance} />
        </div>
      </div>
    </div>
  );
}
