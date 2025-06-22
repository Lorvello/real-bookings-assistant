
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { usePerformanceEfficiency } from '@/hooks/dashboard/usePerformanceEfficiency';
import { Clock, XCircle, AlertTriangle, Gauge, Calendar, MessageSquare } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PerformanceEfficiencyTabProps {
  calendarId: string;
}

export function PerformanceEfficiencyTab({ calendarId }: PerformanceEfficiencyTabProps) {
  const { data: performance, isLoading } = usePerformanceEfficiency(calendarId);

  if (isLoading) {
    return <div className="animate-pulse">Loading performance data...</div>;
  }

  const responseTimeMinutes = performance?.avg_response_time_minutes || 0;
  const noShowRate = performance?.no_show_rate || 0;
  const cancellationRate = performance?.cancellation_rate || 0;
  const utilizationRate = performance?.calendar_utilization_rate || 0;
  const peakHours = performance?.peak_hours || [];

  const getPerformanceColor = (value: number, type: 'response' | 'rate' | 'utilization') => {
    switch (type) {
      case 'response':
        return value <= 5 ? 'text-green-600' : value <= 15 ? 'text-yellow-600' : 'text-red-600';
      case 'rate':
        return value <= 5 ? 'text-green-600' : value <= 15 ? 'text-yellow-600' : 'text-red-600';
      case 'utilization':
        return value >= 80 ? 'text-green-600' : value >= 60 ? 'text-yellow-600' : 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getPerformanceBadge = (value: number, type: 'response' | 'rate' | 'utilization') => {
    switch (type) {
      case 'response':
        return value <= 5 ? 'Uitstekend' : value <= 15 ? 'Goed' : 'Verbetering nodig';
      case 'rate':
        return value <= 5 ? 'Uitstekend' : value <= 15 ? 'Normaal' : 'Hoog';
      case 'utilization':
        return value >= 80 ? 'Hoog' : value >= 60 ? 'Gemiddeld' : 'Laag';
      default:
        return 'Onbekend';
    }
  };

  return (
    <div className="space-y-6">
      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Respons Tijd</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(responseTimeMinutes, 'response')}`}>
                  {responseTimeMinutes.toFixed(1)}m
                </p>
                <Badge variant="outline" className="text-xs mt-1">
                  {getPerformanceBadge(responseTimeMinutes, 'response')}
                </Badge>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-800">No-Show Rate</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(noShowRate, 'rate')}`}>
                  {noShowRate.toFixed(1)}%
                </p>
                <Badge variant="outline" className="text-xs mt-1">
                  {getPerformanceBadge(noShowRate, 'rate')}
                </Badge>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-800">Annulering Rate</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(cancellationRate, 'rate')}`}>
                  {cancellationRate.toFixed(1)}%
                </p>
                <Badge variant="outline" className="text-xs mt-1">
                  {getPerformanceBadge(cancellationRate, 'rate')}
                </Badge>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Benutting</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(utilizationRate, 'utilization')}`}>
                  {utilizationRate.toFixed(1)}%
                </p>
                <Badge variant="outline" className="text-xs mt-1">
                  {getPerformanceBadge(utilizationRate, 'utilization')}
                </Badge>
              </div>
              <Gauge className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Respons Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Gemiddelde respons tijd</span>
                <span className="font-medium">{responseTimeMinutes.toFixed(1)} minuten</span>
              </div>
              <Progress value={Math.min((20 - responseTimeMinutes) / 20 * 100, 100)} className="h-2" />
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {responseTimeMinutes <= 5 ? '🚀' : responseTimeMinutes <= 15 ? '✅' : '⚠️'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {responseTimeMinutes <= 5 ? 'Supersnel' : responseTimeMinutes <= 15 ? 'Goed tempo' : 'Kan beter'}
                  </p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">Doel: &lt;5 min</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Voor optimale klanttevredenheid
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Kalender Efficiëntie
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Kalender benutting</span>
                <span className="font-medium">{utilizationRate.toFixed(1)}%</span>
              </div>
              <Progress value={utilizationRate} className="h-2" />
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">No-Show</p>
                  <p className="text-2xl font-bold text-red-600">{noShowRate.toFixed(1)}%</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">Annuleringen</p>
                  <p className="text-2xl font-bold text-yellow-600">{cancellationRate.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Peak Hours Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Piektijden Analyse</CardTitle>
        </CardHeader>
        <CardContent>
          {peakHours.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={peakHours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="hour" 
                  tickFormatter={(hour) => `${hour}:00`}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(hour) => `${hour}:00 - ${hour + 1}:00`}
                  formatter={(value) => [value, 'Boekingen']}
                />
                <Bar dataKey="count" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Geen piekuren data beschikbaar
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Aanbevelingen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {responseTimeMinutes > 15 && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Verbeter respons tijd</p>
                  <p className="text-sm text-blue-700">
                    Je gemiddelde respons tijd is {responseTimeMinutes.toFixed(1)} minuten. 
                    Overweeg automatische antwoorden of snellere notificaties.
                  </p>
                </div>
              </div>
            )}

            {noShowRate > 10 && (
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">Reduceer no-shows</p>
                  <p className="text-sm text-red-700">
                    Je no-show rate is {noShowRate.toFixed(1)}%. 
                    Overweeg herinneringen te versturen of een bevestigingssysteem.
                  </p>
                </div>
              </div>
            )}

            {utilizationRate < 60 && (
              <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <Calendar className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900">Verhoog kalender benutting</p>
                  <p className="text-sm text-yellow-700">
                    Je kalender benutting is {utilizationRate.toFixed(1)}%. 
                    Overweeg meer beschikbare tijden of marketing om boekingen te verhogen.
                  </p>
                </div>
              </div>
            )}

            {responseTimeMinutes <= 5 && noShowRate <= 5 && utilizationRate >= 80 && (
              <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Gauge className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">Uitstekende performance! 🎉</p>
                  <p className="text-sm text-green-700">
                    Je performance metrics zijn uitstekend. Houd dit niveau vast!
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
