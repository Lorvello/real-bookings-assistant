
import React, { useState } from 'react';
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
  selectedTimeRange: string;
}

export function ServicePerformanceChart({ data, selectedTimeRange }: ServicePerformanceChartProps) {
  const hasData = data && data.length > 0;
  const [filteredData, setFilteredData] = useState<ServicePerformanceData[]>(data || []);

  return (
    <div className="relative group">
      {/* Background glow effect - Orange Theme */}
      <div className="absolute -inset-4 bg-gradient-to-r from-orange-500/20 via-amber-500/15 to-orange-500/20 blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-orange-500/30 rounded-2xl shadow-2xl overflow-hidden">
        <ServicePerformanceHeader hasData={hasData} data={data} selectedTimeRange={selectedTimeRange} />

        <div className="p-8">
          {hasData ? (
            <div className="space-y-6">
              <ServiceChart data={data} onFilteredDataChange={setFilteredData} />
              <ServiceChartLegend />
              <ServiceInsightCards data={filteredData.length > 0 ? filteredData : data} />
            </div>
          ) : (
            <ServiceEmptyState />
          )}
        </div>
      </div>
    </div>
  );
}
