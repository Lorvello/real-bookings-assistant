
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock } from 'lucide-react';
import { PeakHoursStats } from './PeakHoursStats';
import { PeakHoursBarChart } from './PeakHoursBarChart';
import { PeakHoursInsights } from './PeakHoursInsights';
import { PeakHoursRecommendations } from './PeakHoursRecommendations';

interface PeakHoursData {
  hour: number;
  count: number;
  revenue?: number;
  avg_booking_value?: number;
  popular_service?: string;
}

interface PeakHoursChartProps {
  data?: PeakHoursData[];
  isLoading?: boolean;
}

export function PeakHoursChart({ data = [], isLoading }: PeakHoursChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('week');

  // Generate complete 24-hour data with defaults
  const completeHourData = React.useMemo(() => {
    const hourMap = new Map(data.map(item => [item.hour, item]));
    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourMap.get(hour)?.count || 0,
      revenue: hourMap.get(hour)?.revenue || 0,
      avg_booking_value: hourMap.get(hour)?.avg_booking_value || 0,
      popular_service: hourMap.get(hour)?.popular_service || null,
    }));
  }, [data]);

  const maxCount = Math.max(...completeHourData.map(d => d.count));
  const totalBookings = completeHourData.reduce((sum, d) => sum + d.count, 0);
  const totalRevenue = completeHourData.reduce((sum, d) => sum + (d.revenue || 0), 0);
  
  // Find peak hours (top 3)
  const peakHours = completeHourData
    .filter(d => d.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Find quiet hours (bottom 3 with bookings)
  const quietHours = completeHourData
    .filter(d => d.count > 0)
    .sort((a, b) => a.count - b.count)
    .slice(0, 3);

  if (isLoading) {
    return (
      <Card className="border-slate-700/50 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Clock className="h-5 w-5" />
            Piekuren Analyse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-700 rounded w-1/3"></div>
            <div className="h-64 bg-slate-700 rounded"></div>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-slate-700 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-slate-700/50 bg-gradient-to-br from-slate-900/80 to-slate-800/60 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center">
                <Clock className="h-4 w-4 text-slate-200" />
              </div>
              Piekuren Analyse
            </CardTitle>
            <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)}>
              <TabsList className="grid w-full grid-cols-3 bg-slate-800/80">
                <TabsTrigger value="today" className="text-slate-300 data-[state=active]:text-slate-100 data-[state=active]:bg-slate-700">Vandaag</TabsTrigger>
                <TabsTrigger value="week" className="text-slate-300 data-[state=active]:text-slate-100 data-[state=active]:bg-slate-700">Deze Week</TabsTrigger>
                <TabsTrigger value="month" className="text-slate-300 data-[state=active]:text-slate-100 data-[state=active]:bg-slate-700">Deze Maand</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Stats */}
          <PeakHoursStats 
            totalBookings={totalBookings}
            totalRevenue={totalRevenue}
            topPeakHour={peakHours[0]?.hour || null}
          />

          {/* Chart */}
          <PeakHoursBarChart 
            data={completeHourData}
            maxCount={maxCount}
          />

          {/* Insights */}
          <PeakHoursInsights 
            peakHours={peakHours}
            quietHours={quietHours}
          />

          {/* Recommendations */}
          <PeakHoursRecommendations 
            peakHours={peakHours}
            quietHours={quietHours}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}
