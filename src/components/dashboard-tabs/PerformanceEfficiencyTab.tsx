
import React from 'react';
import { useOptimizedPerformanceEfficiency } from '@/hooks/dashboard/useOptimizedPerformanceEfficiency';
import { useRealtimeWebSocket } from '@/hooks/dashboard/useRealtimeWebSocket';
import { Clock, AlertTriangle, Calendar } from 'lucide-react';
import { MetricCard } from './business-intelligence/MetricCard';
import { PeakHoursChart } from './performance/PeakHoursChart';
import { PerformanceInsights } from './performance/PerformanceInsights';

interface PerformanceEfficiencyTabProps {
  calendarId: string;
}

export function PerformanceEfficiencyTab({ calendarId }: PerformanceEfficiencyTabProps) {
  const { data: performance, isLoading } = useOptimizedPerformanceEfficiency(calendarId);
  useRealtimeWebSocket(calendarId);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-muted rounded-lg"></div>
            </div>
          ))}
        </div>
        <div className="h-96 bg-muted rounded-lg animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <MetricCard
          title="Reactietijd"
          value={`${performance?.avg_response_time_minutes?.toFixed(1) || '0.0'}m`}
          subtitle="gemiddeld WhatsApp"
          icon={Clock}
          gradientFrom="from-blue-500/40"
          gradientTo="to-cyan-500/30"
          borderColor="border-blue-200/30"
          iconBgFrom="from-blue-500/20"
          iconBgTo="to-cyan-500/20"
          iconColor="blue"
          delay={0.1}
        />

        <MetricCard
          title="No-show Rate"
          value={`${performance?.no_show_rate?.toFixed(1) || '0.0'}%`}
          subtitle="laatste 30 dagen"
          icon={AlertTriangle}
          gradientFrom="from-red-500/40"
          gradientTo="to-orange-500/30"
          borderColor="border-red-200/30"
          iconBgFrom="from-red-500/20"
          iconBgTo="to-orange-500/20"
          iconColor="red"
          delay={0.2}
        />

        <MetricCard
          title="Annulering Rate"
          value={`${performance?.cancellation_rate?.toFixed(1) || '0.0'}%`}
          subtitle="laatste 30 dagen"
          icon={AlertTriangle}
          gradientFrom="from-orange-500/40"
          gradientTo="to-yellow-500/30"
          borderColor="border-orange-200/30"
          iconBgFrom="from-orange-500/20"
          iconBgTo="to-yellow-500/20"
          iconColor="orange"
          delay={0.3}
        />

        <MetricCard
          title="Kalender Bezetting"
          value={`${performance?.calendar_utilization_rate?.toFixed(1) || '0.0'}%`}
          subtitle="deze week"
          icon={Calendar}
          gradientFrom="from-green-500/40"
          gradientTo="to-emerald-500/30"
          borderColor="border-green-200/30"
          iconBgFrom="from-green-500/20"
          iconBgTo="to-emerald-500/20"
          iconColor="green"
          delay={0.4}
        />
      </div>

      {/* Peak Hours Chart */}
      <PeakHoursChart 
        data={performance?.peak_hours} 
        isLoading={isLoading}
      />

      {/* Performance Insights */}
      <PerformanceInsights
        avgResponseTime={performance?.avg_response_time_minutes}
        noShowRate={performance?.no_show_rate}
        cancellationRate={performance?.cancellation_rate}
        calendarUtilization={performance?.calendar_utilization_rate}
      />
    </div>
  );
}
