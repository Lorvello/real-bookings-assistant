
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartTooltip } from './ChartTooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings2 } from 'lucide-react';

interface ServicePerformanceData {
  service_name: string;
  booking_count: number;
  revenue: number;
  avg_price: number;
}

interface ServiceChartProps {
  data: ServicePerformanceData[];
  onFilteredDataChange?: (filteredData: ServicePerformanceData[]) => void;
}

type ScaleOption = 'auto' | '50' | '100' | '200' | '500' | '1000' | '2000' | '5000' | '10000';

const scaleOptions: { value: ScaleOption; label: string }[] = [
  { value: 'auto', label: 'Auto Scale' },
  { value: '50', label: '0 - 50' },
  { value: '100', label: '0 - 100' },
  { value: '200', label: '0 - 200' },
  { value: '500', label: '0 - 500' },
  { value: '1000', label: '0 - 1000' },
  { value: '2000', label: '0 - 2000' },
  { value: '5000', label: '0 - 5000' },
  { value: '10000', label: '0 - 10000' },
];

type FilterOption = 'all' | string;

export function ServiceChart({ data, onFilteredDataChange }: ServiceChartProps) {
  const [bookingScale, setBookingScale] = useState<ScaleOption>('auto');
  const [revenueScale, setRevenueScale] = useState<ScaleOption>('auto');
  const [selectedService, setSelectedService] = useState<FilterOption>('all');

  // Filter data based on selected service
  const filteredData = useMemo(() => {
    const filtered = selectedService === 'all' ? data : data.filter(d => d.service_name === selectedService);
    
    // Notify parent of filtered data change
    if (onFilteredDataChange) {
      onFilteredDataChange(filtered);
    }
    
    return filtered;
  }, [data, selectedService, onFilteredDataChange]);

  const getScaleMax = (scale: ScaleOption, dataMax: number) => {
    if (scale === 'auto') return Math.ceil(dataMax * 1.1);
    return parseInt(scale);
  };

  const maxBookings = Math.max(...filteredData.map(d => d.booking_count));
  const maxRevenue = Math.max(...filteredData.map(d => d.revenue));

  const bookingScaleMax = getScaleMax(bookingScale, maxBookings);
  const revenueScaleMax = getScaleMax(revenueScale, maxRevenue);

  // Calculate performance percentages
  const dataWithPercentages = filteredData.map(item => ({
    ...item,
    booking_percentage: (item.booking_count / maxBookings) * 100,
    revenue_percentage: (item.revenue / maxRevenue) * 100,
  }));

  return (
    <div className="space-y-6">
      {/* Chart Configuration - All controls in one section */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-300">Chart Configuration</span>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 whitespace-nowrap">Service:</span>
            <Select value={selectedService} onValueChange={(value: FilterOption) => setSelectedService(value)}>
              <SelectTrigger className="w-40 h-8 bg-slate-700/50 border-slate-600/50 text-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-slate-300 focus:bg-slate-700">All Services</SelectItem>
                {data.map(service => (
                  <SelectItem key={service.service_name} value={service.service_name} className="text-slate-300 focus:bg-slate-700">
                    {service.service_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 whitespace-nowrap">Bookings Scale:</span>
            <Select value={bookingScale} onValueChange={(value: ScaleOption) => setBookingScale(value)}>
              <SelectTrigger className="w-32 h-8 bg-slate-700/50 border-slate-600/50 text-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {scaleOptions.slice(0, 6).map(option => (
                  <SelectItem key={option.value} value={option.value} className="text-slate-300 focus:bg-slate-700">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 whitespace-nowrap">Revenue Scale:</span>
            <Select value={revenueScale} onValueChange={(value: ScaleOption) => setRevenueScale(value)}>
              <SelectTrigger className="w-32 h-8 bg-slate-700/50 border-slate-600/50 text-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {scaleOptions.map(option => (
                  <SelectItem key={option.value} value={option.value} className="text-slate-300 focus:bg-slate-700">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Enhanced Chart - Much Larger Height */}
      <div className="h-[600px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dataWithPercentages} margin={{ top: 20, right: 40, left: 20, bottom: 80 }}>
            <defs>
              <linearGradient id="enhancedRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity={0.9} />
                <stop offset="50%" stopColor="rgb(16, 185, 129)" stopOpacity={0.7} />
                <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity={0.3} />
              </linearGradient>
              <linearGradient id="enhancedBookingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity={0.9} />
                <stop offset="50%" stopColor="rgb(59, 130, 246)" stopOpacity={0.7} />
                <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="2 4" 
              stroke="rgb(71, 85, 105)" 
              opacity={0.4}
              horizontal={true}
              vertical={false}
            />
            
            <XAxis 
              dataKey="service_name" 
              tick={{ fill: 'rgb(203, 213, 225)', fontSize: 13, fontWeight: 500 }}
              axisLine={{ stroke: 'rgb(100, 116, 139)', strokeWidth: 1 }}
              tickLine={{ stroke: 'rgb(100, 116, 139)', strokeWidth: 1 }}
              angle={-35}
              textAnchor="end"
              height={90}
              interval={0}
            />
            
            <YAxis 
              yAxisId="bookings"
              orientation="left"
              domain={[0, bookingScaleMax]}
              tick={{ fill: 'rgb(59, 130, 246)', fontSize: 12, fontWeight: 500 }}
              axisLine={{ stroke: 'rgb(59, 130, 246)', strokeWidth: 2, opacity: 0.8 }}
              tickLine={{ stroke: 'rgb(59, 130, 246)', strokeWidth: 1, opacity: 0.6 }}
              label={{ 
                value: 'Aantal Boekingen', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: 'rgb(59, 130, 246)', fontSize: 12, fontWeight: 600 }
              }}
            />
            
            <YAxis 
              yAxisId="revenue"
              orientation="right"
              domain={[0, revenueScaleMax]}
              tick={{ fill: 'rgb(16, 185, 129)', fontSize: 12, fontWeight: 500 }}
              axisLine={{ stroke: 'rgb(16, 185, 129)', strokeWidth: 2, opacity: 0.8 }}
              tickLine={{ stroke: 'rgb(16, 185, 129)', strokeWidth: 1, opacity: 0.6 }}
              label={{ 
                value: 'Omzet (€)', 
                angle: 90, 
                position: 'insideRight',
                style: { textAnchor: 'middle', fill: 'rgb(16, 185, 129)', fontSize: 12, fontWeight: 600 }
              }}
            />
            
            <Tooltip 
              content={<ChartTooltip />}
              cursor={{ 
                fill: 'rgba(148, 163, 184, 0.08)',
                stroke: 'rgba(148, 163, 184, 0.2)',
                strokeWidth: 1,
                radius: 4
              }}
            />
            
            <Bar 
              yAxisId="bookings"
              dataKey="booking_count" 
              fill="url(#enhancedBookingGradient)"
              radius={[6, 6, 0, 0]}
              name="Aantal Boekingen"
              strokeWidth={1}
              stroke="rgba(59, 130, 246, 0.3)"
            />
            
            <Bar 
              yAxisId="revenue"
              dataKey="revenue" 
              fill="url(#enhancedRevenueGradient)"
              radius={[6, 6, 0, 0]}
              name="Omzet (€)"
              strokeWidth={1}
              stroke="rgba(16, 185, 129, 0.3)"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
