
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
        className="bg-gradient-to-br from-card/98 via-card/95 to-card/90 backdrop-blur-3xl border border-primary/30 shadow-2xl p-4 rounded-2xl"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-semibold">{label}:00 - {(parseInt(label) + 1)}:00</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>{data.count} boekingen</span>
            </div>
            {data.revenue && (
              <div className="flex items-center gap-2">
                <Euro className="h-3 w-3 text-green-500" />
                <span>€{data.revenue.toFixed(2)}</span>
              </div>
            )}
          </div>
          {data.popular_service && (
            <div className="pt-2 border-t border-border/50">
              <span className="text-xs text-muted-foreground">Populairste service:</span>
              <p className="font-medium text-xs">{data.popular_service}</p>
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
  if (intensity > 0.8) return '#ef4444'; // Red for very busy
  if (intensity > 0.6) return '#f97316'; // Orange for busy
  if (intensity > 0.4) return '#eab308'; // Yellow for moderate
  if (intensity > 0.2) return '#22c55e'; // Green for quiet
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Piekuren Analyse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted rounded"></div>
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
      <Card className="border-orange-200/30 bg-gradient-to-br from-orange-50/50 to-yellow-50/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-full flex items-center justify-center">
                <Clock className="h-4 w-4 text-white" />
              </div>
              Piekuren Analyse
            </CardTitle>
            <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="today">Vandaag</TabsTrigger>
                <TabsTrigger value="week">Deze Week</TabsTrigger>
                <TabsTrigger value="month">Deze Maand</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Totaal Boekingen</p>
                  <p className="text-2xl font-bold text-blue-900">{totalBookings}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-emerald-100/50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Euro className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">Omzet</p>
                  <p className="text-2xl font-bold text-green-900">€{totalRevenue.toFixed(2)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-purple-800">Piek Moment</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {peakHours[0] ? `${peakHours[0].hour}:00` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white/50 rounded-xl p-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={completeHourData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="hour" 
                  tickFormatter={(hour) => `${hour}:00`}
                  fontSize={12}
                  stroke="#64748b"
                />
                <YAxis fontSize={12} stroke="#64748b" />
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
              <h4 className="font-semibold text-orange-800 flex items-center gap-2">
                🔥 Drukste Uren
              </h4>
              <div className="space-y-2">
                {peakHours.map((hour, index) => (
                  <motion.div
                    key={hour.hour}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="destructive" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <span className="font-medium">{hour.hour}:00 - {hour.hour + 1}:00</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-700">{hour.count} boekingen</p>
                      {hour.revenue && hour.revenue > 0 && (
                        <p className="text-xs text-red-600">€{hour.revenue.toFixed(2)}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Quiet Hours */}
            <div className="space-y-3">
              <h4 className="font-semibold text-green-800 flex items-center gap-2">
                😌 Rustige Uren
              </h4>
              <div className="space-y-2">
                {quietHours.map((hour, index) => (
                  <motion.div
                    key={hour.hour}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                        #{index + 1}
                      </Badge>
                      <span className="font-medium">{hour.hour}:00 - {hour.hour + 1}:00</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-700">{hour.count} boekingen</p>
                      {hour.revenue && hour.revenue > 0 && (
                        <p className="text-xs text-green-600">€{hour.revenue.toFixed(2)}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
              💡 Aanbevelingen
            </h4>
            <div className="space-y-2 text-sm text-blue-700">
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
