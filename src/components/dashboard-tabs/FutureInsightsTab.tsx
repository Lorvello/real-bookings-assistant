
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOptimizedFutureInsights } from '@/hooks/dashboard/useOptimizedFutureInsights';
import { useRealtimeWebSocket } from '@/hooks/dashboard/useRealtimeWebSocket';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Users, Calendar, Clock } from 'lucide-react';
import { MetricCard } from './business-intelligence/MetricCard';

interface FutureInsightsTabProps {
  calendarId: string;
}

export function FutureInsightsTab({ calendarId }: FutureInsightsTabProps) {
  const { data: insights, isLoading } = useOptimizedFutureInsights(calendarId);
  useRealtimeWebSocket(calendarId);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-40 bg-muted rounded-lg"></div>
            </div>
          ))}
        </div>
        <div className="h-96 bg-muted rounded-lg animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Enhanced Future Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <MetricCard
          title="Wachtlijst"
          value={String(insights?.waitlist_size || 0)}
          subtitle="wachtende klanten"
          icon={Clock}
          variant="blue"
          delay={0.1}
        />

        <MetricCard
          title="Terugkerende Klanten"
          value={String(insights?.returning_customers_month || 0)}
          subtitle="deze maand"
          icon={Users}
          variant="green"
          delay={0.2}
        />

        <MetricCard
          title="Trend Analyse"
          value="Stabiel"
          subtitle="komende weken"
          icon={TrendingUp}
          variant="blue"
          delay={0.3}
        />
      </div>

      {/* Enhanced Demand Forecast Chart */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-green-500/30 via-blue-500/20 to-green-500/30 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-slate-700/50 rounded-2xl shadow-2xl">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-xl">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-100">Vraag Voorspelling (Komende Weken)</h3>
            </div>
            
            {insights?.demand_forecast && insights.demand_forecast.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={insights.demand_forecast}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis 
                      dataKey="week_number" 
                      tickFormatter={(week) => `Week ${week}`}
                      stroke="#94A3B8"
                      fontSize={12}
                    />
                    <YAxis stroke="#94A3B8" fontSize={12} />
                    <Tooltip 
                      labelFormatter={(week) => `Week ${week}`}
                      formatter={(value) => [value, 'Verwachte Boekingen']}
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: '12px',
                        color: '#F1F5F9'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="bookings" 
                      stroke="#22C55E" 
                      strokeWidth={3}
                      dot={{ fill: '#22C55E', strokeWidth: 2, r: 6 }}
                      activeDot={{ r: 8, stroke: '#22C55E', strokeWidth: 2, fill: '#1F2937' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-2xl flex items-center justify-center border border-slate-600/30">
                  <TrendingUp className="h-10 w-10 text-slate-400" />
                </div>
                <p className="text-slate-300 font-medium mb-2">Nog geen trend data beschikbaar</p>
                <p className="text-sm text-slate-400">Meer historische data nodig voor voorspellingen</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Seasonal Patterns */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/30 via-green-500/20 to-blue-500/30 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-slate-700/50 rounded-2xl shadow-2xl">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-blue-500/20 to-green-500/20 rounded-xl">
                <Calendar className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-100">Seizoenspatronen</h3>
            </div>
            
            {insights?.seasonal_patterns && insights.seasonal_patterns.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={insights.seasonal_patterns}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis 
                      dataKey="month_name" 
                      stroke="#94A3B8"
                      fontSize={12}
                    />
                    <YAxis stroke="#94A3B8" fontSize={12} />
                    <Tooltip 
                      formatter={(value) => [Math.round(Number(value)), 'Gem. Boekingen']}
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '12px',
                        color: '#F1F5F9'
                      }}
                    />
                    <Bar 
                      dataKey="avg_bookings" 
                      fill="url(#blueGradient)"
                      radius={[4, 4, 0, 0]}
                    />
                    <defs>
                      <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8"/>
                        <stop offset="100%" stopColor="#1E40AF" stopOpacity="0.6"/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-2xl flex items-center justify-center border border-slate-600/30">
                  <Calendar className="h-10 w-10 text-slate-400" />
                </div>
                <p className="text-slate-300 font-medium mb-2">Nog geen seizoensdata beschikbaar</p>
                <p className="text-sm text-slate-400">Een vol jaar data nodig voor patronen</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Insights and Recommendations */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-green-500/20 via-blue-500/15 to-green-500/20 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-slate-700/50 rounded-2xl shadow-2xl">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-xl">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-100">Aanbevelingen & Inzichten</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 rounded-xl">
                <h4 className="font-bold mb-3 text-blue-300 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Wachtlijst Optimalisatie
                </h4>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {insights?.waitlist_size && insights.waitlist_size > 0 
                    ? `Je hebt ${insights.waitlist_size} mensen op de wachtlijst. Overweeg extra tijdslots of prioriteer annuleringen.`
                    : 'Geen wachtlijst op dit moment. Goed teken voor beschikbaarheid!'
                  }
                </p>
              </div>
              
              <div className="p-6 bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border border-green-500/20 rounded-xl">
                <h4 className="font-bold mb-3 text-green-300 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Klant Retentie
                </h4>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {insights?.returning_customers_month && insights.returning_customers_month > 0
                    ? `${insights.returning_customers_month} terugkerende klanten deze maand toont goede klanttevredenheid.`
                    : 'Focus op klanttevredenheid om meer terugkerende klanten te krijgen.'
                  }
                </p>
              </div>
              
              <div className="p-6 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 rounded-xl">
                <h4 className="font-bold mb-3 text-blue-300 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Capaciteit Planning
                </h4>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Analyseer piekperiodes om je schema optimaal in te delen en wachttijden te minimaliseren.
                </p>
              </div>
              
              <div className="p-6 bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border border-green-500/20 rounded-xl">
                <h4 className="font-bold mb-3 text-green-300 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Marketing Timing
                </h4>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Gebruik seizoenspatronen om je marketing inspanningen op de juiste momenten in te zetten.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
