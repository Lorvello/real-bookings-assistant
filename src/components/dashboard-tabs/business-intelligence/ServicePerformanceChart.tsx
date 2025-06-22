
import React from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart } from 'lucide-react';
import { ChartTooltip } from './ChartTooltip';

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
  return (
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
          
          {data && data.length > 0 ? (
            <div className="h-[450px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={data}
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
                  
                  <Tooltip content={<ChartTooltip />} />
                  
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
  );
}
