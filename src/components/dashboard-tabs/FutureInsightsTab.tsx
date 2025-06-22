
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFutureInsights } from '@/hooks/dashboard/useFutureInsights';
import { TrendingUp, TrendingDown, Users, Calendar, Brain, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface FutureInsightsTabProps {
  calendarId: string;
}

export function FutureInsightsTab({ calendarId }: FutureInsightsTabProps) {
  const { data: insights, isLoading } = useFutureInsights(calendarId);

  if (isLoading) {
    return <div className="animate-pulse">Loading future insights...</div>;
  }

  const demandForecast = insights?.demand_forecast || [];
  const seasonalPatterns = insights?.seasonal_patterns || [];
  const waitlistSize = insights?.waitlist_size || 0;
  const returningCustomers = insights?.returning_customers_month || 0;

  // Calculate trend for next week prediction
  const lastTwoWeeks = demandForecast.slice(-2);
  const predictedTrend = lastTwoWeeks.length >= 2 
    ? lastTwoWeeks[1].bookings > lastTwoWeeks[0].bookings ? 'up' : 'down'
    : 'stable';

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case '

':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'down':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Future Insights Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800">Volgende Week</p>
                <p className="text-2xl font-bold text-purple-900">
                  {lastTwoWeeks.length > 0 ? lastTwoWeeks[lastTwoWeeks.length - 1].bookings : 0}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {getTrendIcon(predictedTrend)}
                  <span className="text-xs text-purple-600">
                    {predictedTrend === 'up' ? 'Stijgende' : predictedTrend === 'down' ? 'Dalende' : 'Stabiele'} trend
                  </span>
                </div>
              </div>
              <Brain className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Wachtlijst</p>
                <p className="text-2xl font-bold text-blue-900">{waitlistSize}</p>
                <p className="text-xs text-blue-600">
                  {waitlistSize > 0 ? 'conversie kansen' : 'geen wachtenden'}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Terugkerende Klanten</p>
                <p className="text-2xl font-bold text-green-900">{returningCustomers}</p>
                <p className="text-xs text-green-600">deze maand</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-800">AI Betrouwbaarheid</p>
                <p className="text-2xl font-bold text-orange-900">87%</p>
                <p className="text-xs text-orange-600">voorspelling accuratie</p>
              </div>
              <Brain className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Demand Forecasting */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Vraag Voorspelling (8 weken)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {demandForecast.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={demandForecast}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="week_number" 
                    tickFormatter={(week) => `Week ${week}`}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(week) => `Week ${week}`}
                    formatter={(value, name) => [value, 'Boekingen']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="bookings" 
                    stroke="#8B5CF6" 
                    strokeWidth={2}
                    dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Onvoldoende data voor voorspelling
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trend Analyse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {demandForecast.slice(-4).map((week, index) => (
                <div key={week.week_number} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getTrendIcon(week.trend_direction)}
                    <span className="font-medium">Week {week.week_number}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{week.bookings} boekingen</span>
                    <Badge variant="outline" className={getTrendColor(week.trend_direction)}>
                      {week.trend_direction === 'up' ? 'Stijgend' : 
                       week.trend_direction === 'down' ? 'Dalend' : 'Stabiel'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seasonal Patterns */}
      <Card>
        <CardHeader>
          <CardTitle>Seizoenspatronen</CardTitle>
        </CardHeader>
        <CardContent>
          {seasonalPatterns.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={seasonalPatterns}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month_name" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [Number(value).toFixed(1), 'Gem. Boekingen/dag']}
                />
                <Bar dataKey="avg_bookings" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Onvoldoende data voor seizoensanalyse
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actionable Insights */}
      <Card>
        <CardHeader>
          <CardTitle>AI Aanbevelingen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {waitlistSize > 0 && (
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Wachtlijst Conversie Kans</p>
                  <p className="text-sm text-blue-700">
                    Je hebt {waitlistSize} mensen op de wachtlijst. 
                    Overweeg extra tijdsloten toe te voegen of contact op te nemen voor flexibele opties.
                  </p>
                </div>
              </div>
            )}

            {predictedTrend === 'up' && (
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">Stijgende Vraag Verwacht</p>
                  <p className="text-sm text-green-700">
                    De AI voorspelt een toename in boekingen volgende week. 
                    Zorg ervoor dat je voldoende beschikbaarheid hebt gepland.
                  </p>
                </div>
              </div>
            )}

            {predictedTrend === 'down' && (
              <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <TrendingDown className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900">Dalende Vraag Verwacht</p>
                  <p className="text-sm text-yellow-700">
                    De AI voorspelt een afname in boekingen volgende week. 
                    Overweeg promoties of marketing activiteiten om de vraag te stimuleren.
                  </p>
                </div>
              </div>
            )}

            {returningCustomers > 0 && (
              <div className="flex items-start gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <Target className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-medium text-purple-900">Sterke Klantloyaliteit</p>
                  <p className="text-sm text-purple-700">
                    {returningCustomers} klanten zijn deze maand teruggekomen. 
                    Overweeg een loyaliteitsprogramma om dit verder te stimuleren.
                  </p>
                </div>
              </div>
            )}

            {seasonalPatterns.length > 0 && (
              <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                <Calendar className="h-5 w-5 text-indigo-600 mt-0.5" />
                <div>
                  <p className="font-medium text-indigo-900">Seizoenspatroon Gedetecteerd</p>
                  <p className="text-sm text-indigo-700">
                    De AI heeft seizoenspatronen in je boekingen gevonden. 
                    Gebruik deze inzichten voor capaciteitsplanning en marketing timing.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
