
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
          gradientFrom="from-blue-500/40"
          gradientTo="to-cyan-500/30"
          borderColor="border-blue-200/30"
          iconBgFrom="from-blue-500/20"
          iconBgTo="to-cyan-500/20"
          iconColor="blue"
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
          gradientFrom="from-emerald-500/40"
          gradientTo="to-teal-500/30"
          borderColor="border-emerald-200/30"
          iconBgFrom="from-emerald-500/20"
          iconBgTo="to-teal-500/20"
          iconColor="emerald"
          delay={0.2}
        />

        <MetricCard
          title="Gemiddelde Waarde"
          value={`€${businessIntel?.avg_booking_value?.toFixed(2) || '0.00'}`}
          subtitle="per afspraak"
          icon={Euro}
          gradientFrom="from-purple-500/40"
          gradientTo="to-fuchsia-500/30"
          borderColor="border-purple-200/30"
          iconBgFrom="from-purple-500/20"
          iconBgTo="to-fuchsia-500/20"
          iconColor="purple"
          delay={0.3}
        />

        <MetricCard
          title="Conversie Rate"
          value={`${businessIntel?.whatsapp_conversion_rate?.toFixed(1) || '0.0'}%`}
          subtitle="WhatsApp → Boeking"
          icon={MessageSquare}
          gradientFrom="from-orange-500/40"
          gradientTo="to-yellow-500/30"
          borderColor="border-orange-200/30"
          iconBgFrom="from-orange-500/20"
          iconBgTo="to-yellow-500/20"
          iconColor="orange"
          delay={0.4}
        />
      </div>

      {/* Service Performance Chart */}
      <ServicePerformanceChart data={businessIntel?.service_performance} />
    </div>
  );
}
