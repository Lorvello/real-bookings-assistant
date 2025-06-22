
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOptimizedBusinessIntelligence } from '@/hooks/dashboard/useOptimizedBusinessIntelligence';
import { useRealtimeWebSocket } from '@/hooks/dashboard/useRealtimeWebSocket';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Euro, Users, MessageSquare, BarChart } from 'lucide-react';
import { motion } from 'framer-motion';

interface BusinessIntelligenceTabProps {
  calendarId: string;
}

export function BusinessIntelligenceTab({ calendarId }: BusinessIntelligenceTabProps) {
  const { data: businessIntel, isLoading } = useOptimizedBusinessIntelligence(calendarId);
  useRealtimeWebSocket(calendarId);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[1, 2, 3, 4].map((i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500"></div>
              <div className="relative bg-gradient-to-br from-card/90 via-card/70 to-card/40 backdrop-blur-2xl rounded-3xl p-8 border border-primary/20 shadow-2xl">
                <div className="space-y-6 animate-pulse">
                  <div className="h-4 bg-gradient-to-r from-primary/20 to-primary/5 rounded-2xl w-1/2"></div>
                  <div className="h-10 bg-gradient-to-r from-primary/30 to-primary/10 rounded-2xl w-3/4"></div>
                  <div className="h-3 bg-gradient-to-r from-primary/15 to-primary/5 rounded-2xl w-1/3"></div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  const revenueChange = businessIntel && businessIntel.prev_month_revenue > 0 
    ? ((businessIntel.month_revenue - businessIntel.prev_month_revenue) / businessIntel.prev_month_revenue * 100)
    : 0;

  const isRevenueUp = revenueChange > 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card/95 backdrop-blur-2xl rounded-2xl p-6 border border-primary/30 shadow-2xl"
        >
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full shadow-lg"
                  style={{ backgroundColor: entry.color, boxShadow: `0 0 10px ${entry.color}` }}
                ></div>
                <span className="text-sm font-semibold">
                  {entry.dataKey === 'revenue' ? `€${Number(entry.value).toFixed(2)}` : entry.value}
                </span>
                <span className="text-xs text-muted-foreground">
                  {entry.dataKey === 'booking_count' ? 'Boekingen' : 'Omzet'}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-10">
      {/* Enhanced Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Maand Omzet */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/40 via-blue-400/20 to-cyan-500/30 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-700"></div>
          <div className="relative bg-gradient-to-br from-card/90 via-card/70 to-card/50 backdrop-blur-2xl rounded-3xl p-8 border border-blue-200/30 shadow-2xl hover:shadow-blue-500/20 transition-all duration-500 group-hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/10 to-transparent rounded-3xl"></div>
            <div className="relative flex items-center justify-between">
              <div className="space-y-4">
                <p className="text-sm font-bold tracking-widest text-blue-600/80 uppercase">Maand Omzet</p>
                <p className="text-4xl font-black bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent tabular-nums">
                  €{businessIntel?.month_revenue?.toFixed(2) || '0.00'}
                </p>
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: isRevenueUp ? 0 : 180 }}
                    transition={{ duration: 0.3 }}
                  >
                    <TrendingUp className="h-5 w-5 text-green-500 drop-shadow-lg" />
                  </motion.div>
                  <span className={`text-sm font-bold ${isRevenueUp ? 'text-green-500' : 'text-red-400'} drop-shadow-lg`}>
                    {Math.abs(revenueChange).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-blue-300/20 shadow-xl">
                <Euro className="h-8 w-8 text-blue-500 drop-shadow-lg" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Unieke Klanten */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/40 via-green-400/20 to-teal-500/30 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-700"></div>
          <div className="relative bg-gradient-to-br from-card/90 via-card/70 to-card/50 backdrop-blur-2xl rounded-3xl p-8 border border-emerald-200/30 shadow-2xl hover:shadow-emerald-500/20 transition-all duration-500 group-hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/10 to-transparent rounded-3xl"></div>
            <div className="relative flex items-center justify-between">
              <div className="space-y-4">
                <p className="text-sm font-bold tracking-widest text-emerald-600/80 uppercase">Unieke Klanten</p>
                <p className="text-4xl font-black bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 bg-clip-text text-transparent tabular-nums">
                  {businessIntel?.unique_customers_month || 0}
                </p>
                <p className="text-sm text-emerald-500/80 font-semibold">deze maand</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-emerald-300/20 shadow-xl">
                <Users className="h-8 w-8 text-emerald-500 drop-shadow-lg" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Gemiddelde Waarde */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/40 via-violet-400/20 to-fuchsia-500/30 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-700"></div>
          <div className="relative bg-gradient-to-br from-card/90 via-card/70 to-card/50 backdrop-blur-2xl rounded-3xl p-8 border border-purple-200/30 shadow-2xl hover:shadow-purple-500/20 transition-all duration-500 group-hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50/10 to-transparent rounded-3xl"></div>
            <div className="relative flex items-center justify-between">
              <div className="space-y-4">
                <p className="text-sm font-bold tracking-widest text-purple-600/80 uppercase">Gemiddelde Waarde</p>
                <p className="text-4xl font-black bg-gradient-to-r from-purple-600 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent tabular-nums">
                  €{businessIntel?.avg_booking_value?.toFixed(2) || '0.00'}
                </p>
                <p className="text-sm text-purple-500/80 font-semibold">per afspraak</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-purple-300/20 shadow-xl">
                <Euro className="h-8 w-8 text-purple-500 drop-shadow-lg" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Conversie Rate */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/40 via-amber-400/20 to-yellow-500/30 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-700"></div>
          <div className="relative bg-gradient-to-br from-card/90 via-card/70 to-card/50 backdrop-blur-2xl rounded-3xl p-8 border border-orange-200/30 shadow-2xl hover:shadow-orange-500/20 transition-all duration-500 group-hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50/10 to-transparent rounded-3xl"></div>
            <div className="relative flex items-center justify-between">
              <div className="space-y-4">
                <p className="text-sm font-bold tracking-widest text-orange-600/80 uppercase">Conversie Rate</p>
                <p className="text-4xl font-black bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-500 bg-clip-text text-transparent tabular-nums">
                  {businessIntel?.whatsapp_conversion_rate?.toFixed(1) || '0.0'}%
                </p>
                <p className="text-sm text-orange-500/80 font-semibold">WhatsApp → Boeking</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-orange-300/20 shadow-xl">
                <MessageSquare className="h-8 w-8 text-orange-500 drop-shadow-lg" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Smooth Service Performance Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="relative group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 rounded-[2rem] blur-3xl group-hover:blur-[4rem] transition-all duration-1000"></div>
        <div className="relative bg-gradient-to-br from-card/95 via-card/80 to-card/60 backdrop-blur-2xl rounded-[2rem] overflow-hidden border border-primary/20 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10"></div>
          
          <div className="relative p-10">
            <div className="mb-8">
              <h3 className="text-3xl font-black bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                Service Performance
              </h3>
              <p className="text-muted-foreground/70 mt-2">Smooth data visualization</p>
            </div>
            
            {businessIntel?.service_performance && businessIntel.service_performance.length > 0 ? (
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart 
                    data={businessIntel.service_performance}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient id="bookingGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.8}/>
                        <stop offset="50%" stopColor="#3B82F6" stopOpacity={0.4}/>
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.8}/>
                        <stop offset="50%" stopColor="#10B981" stopOpacity={0.4}/>
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0.1}/>
                      </linearGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge> 
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    
                    <CartesianGrid 
                      strokeDasharray="none" 
                      stroke="rgba(148, 163, 184, 0.1)" 
                      strokeWidth={1}
                      horizontal={true}
                      vertical={false}
                    />
                    
                    <XAxis 
                      dataKey="service_name" 
                      tick={{ fill: 'rgb(148 163 184)', fontSize: 12, fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    
                    <YAxis 
                      tick={{ fill: 'rgb(148 163 184)', fontSize: 12, fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                      dx={-10}
                    />
                    
                    <Tooltip content={<CustomTooltip />} />
                    
                    <Area
                      type="monotone"
                      dataKey="booking_count"
                      stroke="#3B82F6"
                      strokeWidth={3}
                      fill="url(#bookingGradient)"
                      filter="url(#glow)"
                      name="booking_count"
                    />
                    
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10B981"
                      strokeWidth={3}
                      fill="url(#revenueGradient)"
                      filter="url(#glow)"
                      name="revenue"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <div className="w-24 h-24 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-3xl flex items-center justify-center mx-auto mb-8 backdrop-blur-xl border border-primary/20">
                  <BarChart className="h-12 w-12 text-primary/60" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">Nog geen data beschikbaar</h3>
                <p className="text-muted-foreground">Service performance data wordt geladen zodra er boekingen zijn</p>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
