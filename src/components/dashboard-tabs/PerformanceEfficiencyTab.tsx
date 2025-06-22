
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOptimizedPerformanceEfficiency } from '@/hooks/dashboard/useOptimizedPerformanceEfficiency';
import { useRealtimeWebSocket } from '@/hooks/dashboard/useRealtimeWebSocket';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, AlertTriangle, Calendar, Activity } from 'lucide-react';

interface PerformanceEfficiencyTabProps {
  calendarId: string;
}

export function PerformanceEfficiencyTab({ calendarId }: PerformanceEfficiencyTabProps) {
  const { data: performance, isLoading } = useOptimizedPerformanceEfficiency(calendarId);
  useRealtimeWebSocket(calendarId);

  if (isLoading) {
    return <div className="animate-pulse">Loading performance data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Reactietijd</p>
                <p className="text-2xl font-bold text-blue-900">
                  {performance?.avg_response_time_minutes?.toFixed(1) || '0.0'}m
                </p>
                <p className="text-xs text-blue-600">gemiddeld WhatsApp</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-800">No-show Rate</p>
                <p className="text-2xl font-bold text-red-900">
                  {performance?.no_show_rate?.toFixed(1) || '0.0'}%
                </p>
                <p className="text-xs text-red-600">laatste 30 dagen</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-800">Annulering Rate</p>
                <p className="text-2xl font-bold text-orange-900">
                  {performance?.cancellation_rate?.toFixed(1) || '0.0'}%
                </p>
                <p className="text-xs text-orange-600">laatste 30 dagen</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Kalender Bezetting</p>
                <p className="text-2xl font-bold text-green-900">
                  {performance?.calendar_utilization_rate?.toFixed(1) || '0.0'}%
                </p>
                <p className="text-xs text-green-600">deze week</p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Peak Hours Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Piekuren Analyse
          </CardTitle>
        </CardHeader>
        <CardContent>
          {performance?.peak_hours && performance.peak_hours.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performance.peak_hours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="hour" 
                  tickFormatter={(hour) => `${hour}:00`}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(hour) => `${hour}:00 uur`}
                  formatter={(value) => [value, 'Boekingen']}
                />
                <Bar dataKey="count" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nog geen piekuren data beschikbaar</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Inzichten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Reactietijd Status</h4>
              <p className="text-muted-foreground">
                {performance?.avg_response_time_minutes && performance.avg_response_time_minutes < 15 
                  ? '✅ Uitstekende reactietijd - klanten reageren positief op snelle responses'
                  : performance?.avg_response_time_minutes && performance.avg_response_time_minutes < 60
                  ? '⚠️ Reactietijd kan beter - probeer binnen 15 minuten te reageren'
                  : '❌ Langzame reactietijd - dit kan klanten afschrikken'
                }
              </p>
            </div>
            
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Kalender Efficiency</h4>
              <p className="text-muted-foreground">
                {performance?.calendar_utilization_rate && performance.calendar_utilization_rate > 70 
                  ? '✅ Goede bezettingsgraad - kalender wordt efficiënt benut'
                  : performance?.calendar_utilization_rate && performance.calendar_utilization_rate > 40
                  ? '⚠️ Gemiddelde bezetting - er is ruimte voor meer boekingen'
                  : '❌ Lage bezetting - overweeg marketing of andere tijdslots'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
