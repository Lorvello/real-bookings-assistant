
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOptimizedFutureInsights } from '@/hooks/dashboard/useOptimizedFutureInsights';
import { useRealtimeWebSocket } from '@/hooks/dashboard/useRealtimeWebSocket';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Users, Calendar, Clock } from 'lucide-react';

interface FutureInsightsTabProps {
  calendarId: string;
}

export function FutureInsightsTab({ calendarId }: FutureInsightsTabProps) {
  const { data: insights, isLoading } = useOptimizedFutureInsights(calendarId);
  useRealtimeWebSocket(calendarId);

  if (isLoading) {
    return <div className="animate-pulse">Loading future insights...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Key Future Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Wachtlijst</p>
                <p className="text-2xl font-bold text-blue-900">
                  {insights?.waitlist_size || 0}
                </p>
                <p className="text-xs text-blue-600">wachtende klanten</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Terugkerende Klanten</p>
                <p className="text-2xl font-bold text-green-900">
                  {insights?.returning_customers_month || 0}
                </p>
                <p className="text-xs text-green-600">deze maand</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800">Trend Analyse</p>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-5 w-5 text-purple-900" />
                  <span className="text-lg font-bold text-purple-900">Stabiel</span>
                </div>
                <p className="text-xs text-purple-600">komende weken</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Demand Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Vraag Voorspelling (Komende Weken)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights?.demand_forecast && insights.demand_forecast.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={insights.demand_forecast}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="week_number" 
                  tickFormatter={(week) => `Week ${week}`}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(week) => `Week ${week}`}
                  formatter={(value) => [value, 'Verwachte Boekingen']}
                />
                <Line 
                  type="monotone" 
                  dataKey="bookings" 
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  dot={{ fill: '#8B5CF6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nog geen trend data beschikbaar - meer historische data nodig</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seasonal Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Seizoenspatronen
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights?.seasonal_patterns && insights.seasonal_patterns.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={insights.seasonal_patterns}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month_name" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [Math.round(Number(value)), 'Gem. Boekingen']}
                />
                <Bar dataKey="avg_bookings" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nog geen seizoensdata beschikbaar - een vol jaar data nodig</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights and Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Aanbevelingen & Inzichten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium mb-2 text-blue-800">Wachtlijst Optimalisatie</h4>
              <p className="text-blue-700">
                {insights?.waitlist_size && insights.waitlist_size > 0 
                  ? `Je hebt ${insights.waitlist_size} mensen op de wachtlijst. Overweeg extra tijdslots of prioriteer annuleringen.`
                  : 'Geen wachtlijst op dit moment. Goed teken voor beschikbaarheid!'
                }
              </p>
            </div>
            
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium mb-2 text-green-800">Klant Retentie</h4>
              <p className="text-green-700">
                {insights?.returning_customers_month && insights.returning_customers_month > 0
                  ? `${insights.returning_customers_month} terugkerende klanten deze maand toont goede klanttevredenheid.`
                  : 'Focus op klanttevredenheid om meer terugkerende klanten te krijgen.'
                }
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h4 className="font-medium mb-2 text-purple-800">Capaciteit Planning</h4>
              <p className="text-purple-700">
                Analyseer piekperiodes om je schema optimaal in te delen en wachttijden te minimaliseren.
              </p>
            </div>
            
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="font-medium mb-2 text-orange-800">Marketing Timing</h4>
              <p className="text-orange-700">
                Gebruik seizoenspatronen om je marketing inspanningen op de juiste momenten in te zetten.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
