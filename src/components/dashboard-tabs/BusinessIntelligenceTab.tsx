
import React from 'react';
import { useOptimizedBusinessIntelligence } from '@/hooks/dashboard/useOptimizedBusinessIntelligence';
import { useRealtimeWebSocket } from '@/hooks/dashboard/useRealtimeWebSocket';
import { TrendingUp, Euro, Users, MessageSquare } from 'lucide-react';
import { BusinessIntelligenceLoading } from './business-intelligence/BusinessIntelligenceLoading';
import { MetricCard } from './business-intelligence/MetricCard';
import { ServicePerformanceChart } from './business-intelligence/ServicePerformanceChart';

interface BusinessIntelligenceTabProps {
  calendarId: string;
}

export function BusinessIntelligenceTab({ calendarId }: BusinessIntelligenceTabProps) {
  const { data: businessIntel, isLoading } = useOptimizedBusinessIntelligence(calendarId);
  useRealtimeWebSocket(calendarId);

  if (isLoading) {
    return <BusinessIntelligenceLoading />;
  }

  const revenueChange = businessIntel && businessIntel.prev_month_revenue > 0 
    ? ((businessIntel.month_revenue - businessIntel.prev_month_revenue) / businessIntel.prev_month_revenue * 100)
    : 0;

  const isRevenueUp = revenueChange > 0;

  return (
    <div className="space-y-12">
      {/* Organic Key Metrics */}
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
          title="Conversie Rate"
          value={`${businessIntel?.whatsapp_conversion_rate?.toFixed(1) || '0.0'}%`}
          subtitle="WhatsApp → Boeking"
          icon={MessageSquare}
          variant="blue"
          delay={0.4}
        />
      </div>

      {/* Service Performance Chart */}
      <ServicePerformanceChart data={businessIntel?.service_performance} />
    </div>
  );
}
