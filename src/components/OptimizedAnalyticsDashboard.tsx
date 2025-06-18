
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOptimizedAnalytics } from '@/hooks/useOptimizedAnalytics';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Calendar, Euro, Users, RefreshCw } from 'lucide-react';

interface OptimizedAnalyticsDashboardProps {
  calendarId: string;
}

export function OptimizedAnalyticsDashboard({ calendarId }: OptimizedAnalyticsDashboardProps) {
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const { analytics, loading, refreshMaterializedViews } = useOptimizedAnalytics(calendarId, period);

  const handleRefresh = async () => {
    await refreshMaterializedViews();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const calendarStats = analytics?.calendarStats;
  const serviceStats = analytics?.serviceTypeStats || [];

  return (
    <div className="space-y-6">
      {/* Header met refresh knop */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Geoptimaliseerde Analytics</h2>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Vernieuwen
          </Button>
        </div>
        
        <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Afgelopen week</SelectItem>
            <SelectItem value="month">Afgelopen maand</SelectItem>
            <SelectItem value="quarter">Afgelopen kwartaal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics Cards - snelle data uit materialized views */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Totaal Bookings</p>
                <p className="text-2xl font-bold">{calendarStats?.total_bookings || 0}</p>
                <p className="text-xs text-gray-500">
                  Voltooide: {calendarStats?.completed_bookings || 0}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Totale Omzet</p>
                <p className="text-2xl font-bold">€{(calendarStats?.total_revenue || 0).toFixed(2)}</p>
                <p className="text-xs text-gray-500">
                  Uit materialized view
                </p>
              </div>
              <Euro className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Gem. Sessieduur</p>
                <p className="text-2xl font-bold">
                  {(calendarStats?.avg_duration_minutes || 0).toFixed(0)} min
                </p>
                <p className="text-xs text-gray-500">
                  No-shows: {calendarStats?.no_show_bookings || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Performance Chart */}
      {serviceStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Service Type Performance (Materialized View)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={serviceStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="service_name" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'total_revenue' ? `€${Number(value).toFixed(2)}` : value,
                    name === 'total_revenue' ? 'Omzet' : 'Bookings'
                  ]}
                />
                <Bar dataKey="booking_count" fill="#3B82F6" name="Bookings" />
                <Bar dataKey="total_revenue" fill="#10B981" name="Omzet" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Performance Info */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Optimalisaties</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Database Optimalisaties:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Materialized views voor snelle aggregaties</li>
                <li>• Database indexen voor query performance</li>
                <li>• Optimized booking lookups</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Frontend Caching:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• React Query voor intelligente caching</li>
                <li>• Stale-while-revalidate strategie</li>
                <li>• Optimistic updates</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
