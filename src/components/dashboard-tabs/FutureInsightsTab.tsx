
import React from 'react';
import { useOptimizedFutureInsights } from '@/hooks/dashboard/useOptimizedFutureInsights';
import { useOptimizedPerformanceEfficiency } from '@/hooks/dashboard/useOptimizedPerformanceEfficiency';
import { useRealtimeSubscription } from '@/hooks/dashboard/useRealtimeSubscription';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Users, Calendar, Clock } from 'lucide-react';
import { MetricCard } from './business-intelligence/MetricCard';
import { IntelligentRecommendations } from './future-insights/IntelligentRecommendations';

interface FutureInsightsTabProps {
  calendarId: string;
}

export function FutureInsightsTab({ calendarId }: FutureInsightsTabProps) {
  const { data: insights, isLoading: insightsLoading, error: insightsError } = useOptimizedFutureInsights(calendarId);
  const { data: performance, isLoading: performanceLoading, error: performanceError } = useOptimizedPerformanceEfficiency(calendarId);
  useRealtimeSubscription(calendarId);

  const isLoading = insightsLoading || performanceLoading;
  const error = insightsError || performanceError;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-44 bg-muted rounded-lg"></div>
            </div>
          ))}
        </div>
        <div className="h-96 bg-muted rounded-lg animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-400 mb-2">Error loading future insights data</p>
        <p className="text-sm text-slate-400">Please try refreshing the page</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Future Metrics - Purple/Violet Theme */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Waitlist"
          value={String(insights?.waitlist_size || 0)}
          subtitle="waiting customers"
          icon={Clock}
          variant="purple"
          delay={0.1}
        />

        <MetricCard
          title="Returning Customers"
          value={String(insights?.returning_customers_month || 0)}
          subtitle="this month"
          icon={Users}
          variant="purple"
          delay={0.2}
        />

        <MetricCard
          title="Trend Analysis"
          value="Stable"
          subtitle="upcoming weeks"
          icon={TrendingUp}
          variant="purple"
          delay={0.3}
        />
      </div>

      {/* Enhanced Demand Forecast Chart */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-violet-500/15 to-purple-500/20 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-purple-500/30 rounded-2xl shadow-2xl">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-xl">
                <TrendingUp className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-100">Demand Forecast (Upcoming Weeks)</h3>
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
                      formatter={(value) => [value, 'Expected Bookings']}
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        borderRadius: '12px',
                        color: '#F1F5F9'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="bookings" 
                      stroke="#A855F7" 
                      strokeWidth={3}
                      dot={{ fill: '#A855F7', strokeWidth: 2, r: 6 }}
                      activeDot={{ r: 8, stroke: '#A855F7', strokeWidth: 2, fill: '#1F2937' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-2xl flex items-center justify-center border border-slate-600/30">
                  <TrendingUp className="h-10 w-10 text-slate-400" />
                </div>
                <p className="text-slate-300 font-medium mb-2">No trend data available yet</p>
                <p className="text-sm text-slate-400">More historical data needed for forecasts</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Seasonal Patterns */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-violet-500/20 via-purple-500/15 to-violet-500/20 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-violet-500/30 rounded-2xl shadow-2xl">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-xl">
                <Calendar className="h-6 w-6 text-violet-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-100">Seasonal Patterns</h3>
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
                      formatter={(value) => [Math.round(Number(value)), 'Avg. Bookings']}
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        borderRadius: '12px',
                        color: '#F1F5F9'
                      }}
                    />
                    <Bar 
                      dataKey="avg_bookings" 
                      fill="url(#purpleGradient)"
                      radius={[4, 4, 0, 0]}
                    />
                    <defs>
                      <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8"/>
                        <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.6"/>
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
                <p className="text-slate-300 font-medium mb-2">No seasonal data available yet</p>
                <p className="text-sm text-slate-400">A full year of data needed for patterns</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Intelligent Recommendations */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/15 via-violet-500/10 to-purple-500/15 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-purple-500/30 rounded-2xl shadow-2xl">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-xl">
                <TrendingUp className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-100">Intelligent Recommendations</h3>
              <p className="text-sm text-slate-400 ml-auto">Based on your performance data</p>
            </div>
            
            <IntelligentRecommendations
              // Performance data
              avgResponseTime={performance?.avg_response_time_minutes}
              noShowRate={performance?.no_show_rate}
              cancellationRate={performance?.cancellation_rate}
              calendarUtilization={performance?.calendar_utilization_rate}
              
              // Future insights data
              waitlistSize={insights?.waitlist_size}
              returningCustomersMonth={insights?.returning_customers_month}
              demandForecast={insights?.demand_forecast}
              seasonalPatterns={insights?.seasonal_patterns}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
