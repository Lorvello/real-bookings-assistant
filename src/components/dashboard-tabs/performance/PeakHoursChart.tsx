
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp, Euro, Calendar } from 'lucide-react';

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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-slate-900/98 via-slate-800/95 to-slate-900/90 backdrop-blur-3xl border border-slate-600/30 shadow-2xl p-4 rounded-2xl"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-300" />
            <span className="font-semibold text-slate-100">{label}:00 - {(parseInt(label) + 1)}:00</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-slate-400 rounded-full"></div>
              <span className="text-slate-200">{data.count} boekingen</span>
            </div>
            {data.revenue && (
              <div className="flex items-center gap-2">
                <Euro className="h-3 w-3 text-emerald-400" />
                <span className="text-slate-200">€{data.revenue.toFixed(2)}</span>
              </div>
            )}
          </div>
          {data.popular_service && (
            <div className="pt-2 border-t border-slate-600/50">
              <span className="text-xs text-slate-400">Populairste service:</span>
              <p className="font-medium text-xs text-slate-200">{data.popular_service}</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  }
  return null;
};

const getBarColor = (count: number, maxCount: number) => {
  const intensity = count / maxCount;
  if (intensity > 0.8) return '#dc2626'; // Red for very busy
  if (intensity > 0.6) return '#ea580c'; // Orange for busy
  if (intensity > 0.4) return '#ca8a04'; // Yellow for moderate
  if (intensity > 0.2) return '#16a34a'; // Green for quiet
  return '#64748b'; // Gray for very quiet
};

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-slate-800/70 to-slate-700/50 rounded-xl p-4 border border-slate-600/30">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-slate-300" />
                <div>
                  <p className="text-sm font-medium text-slate-400">Totaal Boekingen</p>
                  <p className="text-2xl font-bold text-slate-100">{totalBookings}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/30 rounded-xl p-4 border border-emerald-700/30">
              <div className="flex items-center gap-3">
                <Euro className="h-8 w-8 text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-emerald-300">Omzet</p>
                  <p className="text-2xl font-bold text-emerald-100">€{totalRevenue.toFixed(2)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/30 rounded-xl p-4 border border-blue-700/30">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-blue-300">Piek Moment</p>
                  <p className="text-2xl font-bold text-blue-100">
                    {peakHours[0] ? `${peakHours[0].hour}:00` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={completeHourData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis 
                  dataKey="hour" 
                  tickFormatter={(hour) => `${hour}:00`}
                  fontSize={12}
                  stroke="#94a3b8"
                />
                <YAxis fontSize={12} stroke="#94a3b8" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {completeHourData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getBarColor(entry.count, maxCount)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Peak Hours */}
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-200 flex items-center gap-2">
                🔥 Drukste Uren
              </h4>
              <div className="space-y-2">
                {peakHours.map((hour, index) => (
                  <motion.div
                    key={hour.hour}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-red-900/30 rounded-lg border border-red-800/40"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="destructive" className="text-xs bg-red-700/80">
                        #{index + 1}
                      </Badge>
                      <span className="font-medium text-slate-200">{hour.hour}:00 - {hour.hour + 1}:00</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-300">{hour.count} boekingen</p>
                      {hour.revenue && hour.revenue > 0 && (
                        <p className="text-xs text-red-400">€{hour.revenue.toFixed(2)}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Quiet Hours */}
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-200 flex items-center gap-2">
                😌 Rustige Uren
              </h4>
              <div className="space-y-2">
                {quietHours.map((hour, index) => (
                  <motion.div
                    key={hour.hour}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-green-900/30 rounded-lg border border-green-800/40"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs bg-green-800/50 text-green-300 border-green-700/50">
                        #{index + 1}
                      </Badge>
                      <span className="font-medium text-slate-200">{hour.hour}:00 - {hour.hour + 1}:00</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-300">{hour.count} boekingen</p>
                      {hour.revenue && hour.revenue > 0 && (
                        <p className="text-xs text-green-400">€{hour.revenue.toFixed(2)}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-gradient-to-r from-slate-800/60 to-slate-700/50 rounded-xl p-4 border border-slate-600/40">
            <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
              💡 Aanbevelingen
            </h4>
            <div className="space-y-2 text-sm text-slate-300">
              {peakHours[0] && (
                <p>• Overweeg extra personeel in te zetten tijdens piekuur ({peakHours[0].hour}:00-{peakHours[0].hour + 1}:00)</p>
              )}
              {quietHours[0] && (
                <p>• Gebruik rustige uren ({quietHours[0].hour}:00-{quietHours[0].hour + 1}:00) voor administratie of marketing</p>
              )}
              <p>• Implementeer dynamische prijsstelling voor piekuren om vraag te spreiden</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
