
import React from 'react';
import { ServicePerformanceHeader } from './ServicePerformanceHeader';
import { ServiceChart } from './ServiceChart';
import { ServiceChartLegend } from './ServiceChartLegend';
import { ServiceInsightCards } from './ServiceInsightCards';
import { ServiceEmptyState } from './ServiceEmptyState';

interface ServicePerformanceData {
  service_name: string;
  booking_count: number;
  revenue: number;
  avg_price: number;
}

interface ServicePerformanceChartProps {
  data: ServicePerformanceData[] | undefined;
}

export function ServicePerformanceChart({ data }: ServicePerformanceChartProps) {
  const hasData = data && data.length > 0;

  return (
    <div className="relative group">
      {/* Background glow effect */}
      <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-cyan-500/15 to-emerald-500/20 blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
        <ServicePerformanceHeader hasData={hasData} data={data} />

        <div className="p-8">
          {hasData ? (
            <div className="space-y-8">
              <ServiceChart data={data} />
              <ServiceChartLegend />
              <ServiceInsightCards data={data} />
            </div>
          ) : (
            <ServiceEmptyState />
          )}
        </div>
      </div>
    </div>
  );
}
