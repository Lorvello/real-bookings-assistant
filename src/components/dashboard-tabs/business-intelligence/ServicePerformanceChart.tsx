
import React, { useState } from 'react';
import { ServicePerformanceHeader } from './ServicePerformanceHeader';
import { ServiceChart } from './ServiceChart';
import { ServiceChartLegend } from './ServiceChartLegend';
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
    <div className="relative">
      <div className="relative bg-card border border-white/[0.08] rounded-2xl overflow-visible">
        <ServicePerformanceHeader hasData={hasData} data={data} selectedTimeRange={selectedTimeRange} />

        <div className="p-8">
          {hasData ? (
            <div className="space-y-4">
              <ServiceChart data={data} onFilteredDataChange={setFilteredData} />
              <ServiceChartLegend />
            </div>
          ) : (
            <ServiceEmptyState />
          )}
        </div>
      </div>
    </div>
  );
}
