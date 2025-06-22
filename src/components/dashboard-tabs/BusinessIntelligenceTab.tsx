
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
      <div className="space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[1, 2, 3, 4].map((i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="relative group"
            >
              <div className="absolute -inset-2 bg-gradient-to-br from-primary/30 via-primary/15 to-transparent blur-2xl"
                   style={{
                     borderRadius: '40% 60% 50% 70% / 60% 40% 70% 50%'
                   }}></div>
              <div className="relative bg-gradient-to-br from-card/95 via-card/80 to-card/60 backdrop-blur-2xl border border-primary/20 shadow-2xl p-8"
                   style={{
                     borderRadius: '1.5rem 3rem 1.5rem 3rem / 2rem 1.5rem 2.5rem 1.5rem'
                   }}>
                <div className="space-y-6 animate-pulse">
                  <div className="h-4 bg-gradient-to-r from-primary/20 to-primary/5 rounded-full w-1/2"
                       style={{ borderRadius: '1rem 2rem 1rem 2rem' }}></div>
                  <div className="h-10 bg-gradient-to-r from-primary/30 to-primary/10 rounded-full w-3/4"
                       style={{ borderRadius: '1.5rem 3rem 1.5rem 3rem' }}></div>
                  <div className="h-3 bg-gradient-to-r from-primary/15 to-primary/5 rounded-full w-1/3"
                       style={{ borderRadius: '0.5rem 1.5rem 0.5rem 1.5rem' }}></div>
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
          className="bg-gradient-to-br from-card/98 via-card/95 to-card/90 backdrop-blur-3xl border border-primary/30 shadow-2xl p-6"
          style={{
            borderRadius: '1rem 2rem 1rem 2rem / 1.5rem 1rem 1.5rem 1rem'
          }}
        >
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 shadow-lg"
                  style={{ 
                    backgroundColor: entry.color, 
                    boxShadow: `0 0 15px ${entry.color}`,
                    borderRadius: '50% 80% 50% 80%'
                  }}
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
    <div className="space-y-12">
      {/* Organic Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Maand Omzet */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative group"
        >
          <div className="absolute -inset-3 bg-gradient-to-br from-blue-500/40 via-blue-400/20 to-cyan-500/30 blur-2xl group-hover:blur-3xl transition-all duration-700"
               style={{
                 borderRadius: '40% 60% 50% 80% / 60% 40% 70% 30%'
               }}></div>
          <div className="relative bg-gradient-to-br from-card/95 via-card/85 to-card/70 backdrop-blur-2xl border border-blue-200/30 shadow-2xl hover:shadow-blue-500/20 transition-all duration-500 group-hover:scale-105 p-8"
               style={{
                 borderRadius: '1.5rem 3rem 1.5rem 3rem / 2rem 1.5rem 2.5rem 1.5rem'
               }}>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/10 to-transparent"
                 style={{
                   borderRadius: '1.5rem 3rem 1.5rem 3rem / 2rem 1.5rem 2.5rem 1.5rem'
                 }}></div>
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
                    className="w-6 h-6 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center shadow-lg"
                    style={{ borderRadius: '50% 70% 50% 70%' }}
                  >
                    <TrendingUp className="h-3 w-3 text-white" />
                  </motion.div>
                  <span className={`text-sm font-bold ${isRevenueUp ? 'text-green-500' : 'text-red-400'} drop-shadow-lg`}>
                    {Math.abs(revenueChange).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-xl border border-blue-300/20 shadow-xl flex items-center justify-center"
                   style={{
                     borderRadius: '1rem 2rem 1rem 2rem / 1.5rem 1rem 1.5rem 1rem'
                   }}>
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
          <div className="absolute -inset-3 bg-gradient-to-br from-emerald-500/40 via-green-400/20 to-teal-500/30 blur-2xl group-hover:blur-3xl transition-all duration-700"
               style={{
                 borderRadius: '60% 40% 70% 30% / 40% 60% 30% 70%'
               }}></div>
          <div className="relative bg-gradient-to-br from-card/95 via-card/85 to-card/70 backdrop-blur-2xl border border-emerald-200/30 shadow-2xl hover:shadow-emerald-500/20 transition-all duration-500 group-hover:scale-105 p-8"
               style={{
                 borderRadius: '1.5rem 3rem 1.5rem 3rem / 2rem 1.5rem 2.5rem 1.5rem'
               }}>
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/10 to-transparent"
                 style={{
                   borderRadius: '1.5rem 3rem 1.5rem 3rem / 2rem 1.5rem 2.5rem 1.5rem'
                 }}></div>
            <div className="relative flex items-center justify-between">
              <div className="space-y-4">
                <p className="text-sm font-bold tracking-widest text-emerald-600/80 uppercase">Unieke Klanten</p>
                <p className="text-4xl font-black bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 bg-clip-text text-transparent tabular-nums">
                  {businessIntel?.unique_customers_month || 0}
                </p>
                <p className="text-sm text-emerald-500/80 font-semibold">deze maand</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 backdrop-blur-xl border border-emerald-300/20 shadow-xl flex items-center justify-center"
                   style={{
                     borderRadius: '1rem 2rem 1rem 2rem / 1.5rem 1rem 1.5rem 1rem'
                   }}>
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
          <div className="absolute -inset-3 bg-gradient-to-br from-purple-500/40 via-violet-400/20 to-fuchsia-500/30 blur-2xl group-hover:blur-3xl transition-all duration-700"
               style={{
                 borderRadius: '50% 80% 40% 60% / 70% 30% 60% 40%'
               }}></div>
          <div className="relative bg-gradient-to-br from-card/95 via-card/85 to-card/70 backdrop-blur-2xl border border-purple-200/30 shadow-2xl hover:shadow-purple-500/20 transition-all duration-500 group-hover:scale-105 p-8"
               style={{
                 borderRadius: '1.5rem 3rem 1.5rem 3rem / 2rem 1.5rem 2.5rem 1.5rem'
               }}>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50/10 to-transparent"
                 style={{
                   borderRadius: '1.5rem 3rem 1.5rem 3rem / 2rem 1.5rem 2.5rem 1.5rem'
                 }}></div>
            <div className="relative flex items-center justify-between">
              <div className="space-y-4">
                <p className="text-sm font-bold tracking-widest text-purple-600/80 uppercase">Gemiddelde Waarde</p>
                <p className="text-4xl font-black bg-gradient-to-r from-purple-600 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent tabular-nums">
                  €{businessIntel?.avg_booking_value?.toFixed(2) || '0.00'}
                </p>
                <p className="text-sm text-purple-500/80 font-semibold">per afspraak</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 backdrop-blur-xl border border-purple-300/20 shadow-xl flex items-center justify-center"
                   style={{
                     borderRadius: '1rem 2rem 1rem 2rem / 1.5rem 1rem 1.5rem 1rem'
                   }}>
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
          <div className="absolute -inset-3 bg-gradient-to-br from-orange-500/40 via-amber-400/20 to-yellow-500/30 blur-2xl group-hover:blur-3xl transition-all duration-700"
               style={{
                 borderRadius: '70% 30% 60% 40% / 30% 70% 40% 60%'
               }}></div>
          <div className="relative bg-gradient-to-br from-card/95 via-card/85 to-card/70 backdrop-blur-2xl border border-orange-200/30 shadow-2xl hover:shadow-orange-500/20 transition-all duration-500 group-hover:scale-105 p-8"
               style={{
                 borderRadius: '1.5rem 3rem 1.5rem 3rem / 2rem 1.5rem 2.5rem 1.5rem'
               }}>
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50/10 to-transparent"
                 style={{
                   borderRadius: '1.5rem 3rem 1.5rem 3rem / 2rem 1.5rem 2.5rem 1.5rem'
                 }}></div>
            <div className="relative flex items-center justify-between">
              <div className="space-y-4">
                <p className="text-sm font-bold tracking-widest text-orange-600/80 uppercase">Conversie Rate</p>
                <p className="text-4xl font-black bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-500 bg-clip-text text-transparent tabular-nums">
                  {businessIntel?.whatsapp_conversion_rate?.toFixed(1) || '0.0'}%
                </p>
                <p className="text-sm text-orange-500/80 font-semibold">WhatsApp → Boeking</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 backdrop-blur-xl border border-orange-300/20 shadow-xl flex items-center justify-center"
                   style={{
                     borderRadius: '1rem 2rem 1rem 2rem / 1.5rem 1rem 1.5rem 1rem'
                   }}>
                <MessageSquare className="h-8 w-8 text-orange-500 drop-shadow-lg" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Liquid Service Performance Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="relative group"
      >
        <div className="absolute -inset-6 bg-gradient-to-br from-primary/25 via-purple-500/15 to-blue-500/20 blur-3xl group-hover:blur-[4rem] transition-all duration-1000"
             style={{
               borderRadius: '30% 70% 40% 60% / 50% 30% 70% 50%'
             }}></div>
        <div className="relative bg-gradient-to-br from-card/98 via-card/90 to-card/80 backdrop-blur-3xl overflow-hidden border border-primary/20 shadow-2xl"
             style={{
               borderRadius: '2rem 6rem 2rem 6rem / 3rem 2rem 5rem 2rem'
             }}>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-purple-500/6"
               style={{
                 borderRadius: '2rem 6rem 2rem 6rem / 3rem 2rem 5rem 2rem'
               }}></div>
          
          <div className="relative p-12">
            <div className="mb-10">
              <h3 className="text-3xl font-black bg-gradient-to-r from-foreground via-primary to-purple-400 bg-clip-text text-transparent">
                Service Performance
              </h3>
              <p className="text-muted-foreground/70 mt-3 text-lg">Liquid data visualization met organische flow</p>
            </div>
            
            {businessIntel?.service_performance && businessIntel.service_performance.length > 0 ? (
              <div className="h-[450px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart 
                    data={businessIntel.service_performance}
                    margin={{ top: 30, right: 40, left: 30, bottom: 30 }}
                  >
                    <defs>
                      <linearGradient id="liquidBookingGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.9}/>
                        <stop offset="30%" stopColor="#3B82F6" stopOpacity={0.6}/>
                        <stop offset="70%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="liquidRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.9}/>
                        <stop offset="30%" stopColor="#10B981" stopOpacity={0.6}/>
                        <stop offset="70%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0.1}/>
                      </linearGradient>
                      <filter id="liquidGlow">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                        <feMerge> 
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                      <filter id="liquidShadow">
                        <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.3"/>
                      </filter>
                    </defs>
                    
                    <CartesianGrid 
                      strokeDasharray="none" 
                      stroke="transparent"
                      horizontal={false}
                      vertical={false}
                    />
                    
                    <XAxis 
                      dataKey="service_name" 
                      tick={{ fill: 'rgb(148 163 184)', fontSize: 13, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      dy={15}
                    />
                    
                    <YAxis 
                      tick={{ fill: 'rgb(148 163 184)', fontSize: 13, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      dx={-15}
                    />
                    
                    <Tooltip content={<CustomTooltip />} />
                    
                    <Area
                      type="monotone"
                      dataKey="booking_count"
                      stroke="#3B82F6"
                      strokeWidth={4}
                      fill="url(#liquidBookingGradient)"
                      filter="url(#liquidGlow)"
                      name="booking_count"
                    />
                    
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10B981"
                      strokeWidth={4}
                      fill="url(#liquidRevenueGradient)"
                      filter="url(#liquidGlow)"
                      name="revenue"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-24"
              >
                <div className="relative w-32 h-32 mx-auto mb-10">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-primary/15 to-transparent blur-2xl"
                       style={{
                         borderRadius: '40% 60% 50% 70% / 60% 40% 70% 50%'
                       }}></div>
                  <div className="relative w-full h-full bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-xl border border-primary/20 flex items-center justify-center"
                       style={{
                         borderRadius: '30% 70% 40% 60% / 50% 30% 70% 50%'
                       }}>
                    <BarChart className="h-16 w-16 text-primary/60" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-4">Nog geen data beschikbaar</h3>
                <p className="text-muted-foreground">Service performance data wordt geladen zodra er boekingen zijn</p>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
