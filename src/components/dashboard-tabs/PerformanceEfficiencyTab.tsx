
import React from 'react';
import { useOptimizedPerformanceEfficiency } from '@/hooks/dashboard/useOptimizedPerformanceEfficiency';
import { useRealtimeSubscription } from '@/hooks/dashboard/useRealtimeSubscription';
import { Clock, AlertTriangle, Calendar, TrendingUp, Activity } from 'lucide-react';
import { MetricCard } from './business-intelligence/MetricCard';
import { PeakHoursChart } from './performance/PeakHoursChart';
import { PerformanceInsights } from './performance/PerformanceInsights';

interface PerformanceEfficiencyTabProps {
  calendarId: string;
}

export function PerformanceEfficiencyTab({ calendarId }: PerformanceEfficiencyTabProps) {
  const { data: performance, isLoading, error } = useOptimizedPerformanceEfficiency(calendarId);
  useRealtimeSubscription(calendarId);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              className="h-40 bg-gradient-to-br from-slate-800/40 to-slate-900/60 rounded-2xl animate-pulse border border-slate-700/30"
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

  return (
    <div className="space-y-12">
      {/* Enhanced Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <MetricCard
          title="Reactietijd"
          value={`${performance?.avg_response_time_minutes?.toFixed(1) || '0.0'}m`}
          subtitle="gemiddeld WhatsApp"
          icon={Clock}
          variant="blue"
          delay={0.1}
        />

        <MetricCard
          title="No-show Rate"
          value={`${performance?.no_show_rate?.toFixed(1) || '0.0'}%`}
          subtitle="laatste 30 dagen"
          icon={AlertTriangle}
          variant="blue"
          delay={0.2}
        />

        <MetricCard
          title="Annulering Rate"
          value={`${performance?.cancellation_rate?.toFixed(1) || '0.0'}%`}
          subtitle="laatste 30 dagen"
          icon={AlertTriangle}
          variant="blue"
          delay={0.3}
        />

        <MetricCard
          title="Kalender Bezetting"
          value={`${performance?.calendar_utilization_rate?.toFixed(1) || '0.0'}%`}
          subtitle="deze week"
          icon={Calendar}
          variant="green"
          delay={0.4}
        />
      </div>

      {/* Enhanced Peak Hours Chart */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/30 via-green-500/20 to-blue-500/30 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-slate-700/50 rounded-2xl shadow-2xl">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-blue-500/20 to-green-500/20 rounded-xl">
                <Activity className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-100">Piekuren Analyse</h3>
            </div>
            
            <PeakHoursChart 
              data={performance?.peak_hours} 
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Enhanced Performance Insights */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-green-500/30 via-blue-500/20 to-green-500/30 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-slate-700/50 rounded-2xl shadow-2xl">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-xl">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-100">Performance Inzichten & Aanbevelingen</h3>
            </div>
            
            <PerformanceInsights
              avgResponseTime={performance?.avg_response_time_minutes}
              noShowRate={performance?.no_show_rate}
              cancellationRate={performance?.cancellation_rate}
              calendarUtilization={performance?.calendar_utilization_rate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
