
import React from 'react';
import { useOptimizedFutureInsights } from '@/hooks/dashboard/useOptimizedFutureInsights';
import { useRealtimeSubscription } from '@/hooks/dashboard/useRealtimeSubscription';
import { TrendingUp, Calendar, Target, Brain } from 'lucide-react';
import { MetricCard } from './business-intelligence/MetricCard';
import { DemandForecastChart } from './future-insights/DemandForecastChart';
import { SeasonalPatternsChart } from './future-insights/SeasonalPatternsChart';
import { IntelligentRecommendations } from './future-insights/IntelligentRecommendations';

interface FutureInsightsTabProps {
  calendarId: string;
}

export function FutureInsightsTab({ calendarId }: FutureInsightsTabProps) {
  const { data: futureInsights, isLoading, error } = useOptimizedFutureInsights(calendarId);
  useRealtimeSubscription(calendarId);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-gradient-to-br from-slate-800/40 to-slate-900/60 rounded-2xl animate-pulse border border-slate-700/30" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="h-96 bg-gradient-to-br from-slate-800/40 to-slate-900/60 rounded-2xl animate-pulse border border-slate-700/30"></div>
          <div className="h-96 bg-gradient-to-br from-slate-800/40 to-slate-900/60 rounded-2xl animate-pulse border border-slate-700/30"></div>
        </div>
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
      {/* Future Insights Metrics - Purple Theme */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Customer Growth"
          value={`${futureInsights?.customer_growth_rate?.toFixed(1) || '0.0'}%`}
          subtitle="month over month"
          icon={TrendingUp}
          variant="purple"
          delay={0.1}
        />

        <MetricCard
          title="Capacity Utilization"
          value={`${futureInsights?.capacity_utilization?.toFixed(1) || '0.0'}%`}
          subtitle="current week"
          icon={Target}
          variant="purple"
          delay={0.2}
        />

        <MetricCard
          title="AI Insights"
          value={String(futureInsights?.demand_forecast?.length || 4)}
          subtitle="recommendations ready"
          icon={Brain}
          variant="purple"
          delay={0.3}
        />

        <MetricCard
          title="Demand Forecast"
          value={`+${((futureInsights?.demand_forecast?.[0]?.bookings || 0) * 0.15).toFixed(1)}%`}
          subtitle="next week projection"
          icon={Calendar}
          variant="purple"
          delay={0.4}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Demand Forecast Chart */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-violet-500/15 to-purple-500/20 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-purple-500/30 rounded-2xl shadow-2xl">
            <DemandForecastChart data={futureInsights?.demand_forecast} />
          </div>
        </div>

        {/* Seasonal Patterns Chart */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-violet-500/15 to-purple-500/20 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-purple-500/30 rounded-2xl shadow-2xl">
            <SeasonalPatternsChart data={futureInsights?.seasonal_patterns} />
          </div>
        </div>
      </div>

      {/* AI-Powered Recommendations */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-violet-500/15 to-purple-500/20 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl border border-purple-500/30 rounded-2xl shadow-2xl">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-xl">
                <Brain className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-100">AI-Powered Recommendations</h3>
            </div>
            
            <IntelligentRecommendations 
              customerGrowthRate={futureInsights?.customer_growth_rate}
              demandForecast={futureInsights?.demand_forecast}
              seasonalPatterns={futureInsights?.seasonal_patterns}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
