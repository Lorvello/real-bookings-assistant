
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Euro, Activity } from 'lucide-react';
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
  const hasData = data && data.length > 0;
  const maxRevenue = hasData ? Math.max(...data.map(d => d.revenue)) : 0;
  const maxBookings = hasData ? Math.max(...data.map(d => d.booking_count)) : 0;

  return (
    <div className="relative group">
      {/* Background glow effect */}
      <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-cyan-500/15 to-emerald-500/20 blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-slate-700/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl backdrop-blur-sm border border-blue-500/20">
                <TrendingUp className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-100 mb-1">Service Performance</h3>
                <p className="text-slate-400">Omzet en boekingen per service</p>
              </div>
            </div>
            
            {hasData && (
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-slate-400">Totale Services</p>
                  <p className="text-xl font-bold text-slate-200">{data.length}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">Totale Omzet</p>
                  <p className="text-xl font-bold text-emerald-400">
                    €{data.reduce((sum, item) => sum + item.revenue, 0).toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chart Content */}
        <div className="p-8">
          {hasData ? (
            <div className="space-y-8">
              {/* Chart */}
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.2} />
                      </linearGradient>
                      <linearGradient id="bookingGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke="#475569" 
                      opacity={0.3}
                    />
                    
                    <XAxis 
                      dataKey="service_name" 
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      axisLine={{ stroke: '#475569' }}
                      tickLine={{ stroke: '#475569' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    
                    <YAxis 
                      yAxisId="bookings"
                      orientation="left"
                      tick={{ fill: '#3b82f6', fontSize: 12 }}
                      axisLine={{ stroke: '#3b82f6', opacity: 0.5 }}
                      tickLine={{ stroke: '#3b82f6', opacity: 0.5 }}
                    />
                    
                    <YAxis 
                      yAxisId="revenue"
                      orientation="right"
                      tick={{ fill: '#10b981', fontSize: 12 }}
                      axisLine={{ stroke: '#10b981', opacity: 0.5 }}
                      tickLine={{ stroke: '#10b981', opacity: 0.5 }}
                    />
                    
                    <Tooltip content={<ChartTooltip />} />
                    
                    <Bar 
                      yAxisId="bookings"
                      dataKey="booking_count" 
                      fill="url(#bookingGradient)"
                      radius={[4, 4, 0, 0]}
                      name="Boekingen"
                    />
                    
                    <Bar 
                      yAxisId="revenue"
                      dataKey="revenue" 
                      fill="url(#revenueGradient)"
                      radius={[4, 4, 0, 0]}
                      name="Omzet (€)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-8">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-blue-400 rounded shadow-lg shadow-blue-500/25"></div>
                  <span className="text-sm font-medium text-slate-300">Aantal Boekingen</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded shadow-lg shadow-emerald-500/25"></div>
                  <span className="text-sm font-medium text-slate-300">Omzet (€)</span>
                </div>
              </div>

              {/* Top Performer Insights */}
              {data.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-slate-700/30">
                  <div className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <Activity className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-medium text-blue-300">Populairste Service</span>
                    </div>
                    <p className="text-lg font-bold text-slate-100">
                      {data.reduce((prev, current) => 
                        prev.booking_count > current.booking_count ? prev : current
                      ).service_name}
                    </p>
                    <p className="text-sm text-slate-400">
                      {Math.max(...data.map(d => d.booking_count))} boekingen
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <Euro className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-300">Hoogste Omzet</span>
                    </div>
                    <p className="text-lg font-bold text-slate-100">
                      {data.reduce((prev, current) => 
                        prev.revenue > current.revenue ? prev : current
                      ).service_name}
                    </p>
                    <p className="text-sm text-slate-400">
                      €{maxRevenue.toFixed(2)}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-purple-500/10 to-fuchsia-500/5 border border-purple-500/20 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingUp className="h-4 w-4 text-purple-400" />
                      <span className="text-sm font-medium text-purple-300">Hoogste Gemiddelde</span>
                    </div>
                    <p className="text-lg font-bold text-slate-100">
                      {data.reduce((prev, current) => 
                        prev.avg_price > current.avg_price ? prev : current
                      ).service_name}
                    </p>
                    <p className="text-sm text-slate-400">
                      €{Math.max(...data.map(d => d.avg_price)).toFixed(2)} gem.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-600/30 to-slate-700/20 blur-xl rounded-full"></div>
                <div className="relative w-full h-full bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-2xl flex items-center justify-center border border-slate-600/30">
                  <TrendingUp className="h-10 w-10 text-slate-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-slate-200 mb-2">Nog geen service data</h3>
              <p className="text-slate-400 max-w-md mx-auto">
                Service performance wordt weergegeven zodra er boekingen zijn gemaakt voor verschillende services.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
