
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics';
import { useRealtimeBookings } from '@/hooks/useRealtimeBookings';
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';
import { TrendingUp, TrendingDown, Calendar, Euro, Users, Clock } from 'lucide-react';

interface RealtimeDashboardProps {
  calendarId: string;
}

export function RealtimeDashboard({ calendarId }: RealtimeDashboardProps) {
  // Enable real-time subscriptions
  useRealtimeBookings(calendarId);
  useRealtimeDashboard(calendarId);
  
  const { data: analytics, isLoading, error } = useDashboardAnalytics(calendarId);

  console.log('🎯 RealtimeDashboard render:', { calendarId, analytics, isLoading, error });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    console.error('Dashboard analytics error:', error);
    return (
      <Card className="col-span-full">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Error loading dashboard data</p>
            <p className="text-sm text-gray-500">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const weekChange = calculatePercentageChange(
    analytics?.week_bookings || 0, 
    analytics?.prev_week_bookings || 0
  );
  
  const revenueChange = calculatePercentageChange(
    analytics?.total_revenue || 0,
    analytics?.prev_month_revenue || 0
  );

  return (
    <div className="space-y-6">
      {/* Real-time indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>Live data - updates in real-time</span>
        {analytics?.last_updated && (
          <span className="ml-2">
            (laatste update: {new Date(analytics.last_updated).toLocaleTimeString('nl-NL')})
          </span>
        )}
      </div>

      {/* Debug info tijdens development */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <p className="text-sm text-yellow-800">
              Debug: Calendar ID: {calendarId} | 
              Vandaag: {analytics?.today_bookings} | 
              Deze week: {analytics?.week_bookings} | 
              Deze maand: {analytics?.month_bookings}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vandaag</p>
                <p className="text-2xl font-bold">{analytics?.today_bookings || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {analytics?.pending_bookings || 0} wachtend
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
                <p className="text-sm font-medium text-muted-foreground">Deze Week</p>
                <p className="text-2xl font-bold">{analytics?.week_bookings || 0}</p>
                <div className="flex items-center gap-1">
                  {weekChange > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : weekChange < 0 ? (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  ) : null}
                  <span className={`text-xs ${
                    weekChange > 0 ? 'text-green-600' : 
                    weekChange < 0 ? 'text-red-600' : 
                    'text-muted-foreground'
                  }`}>
                    {weekChange > 0 ? '+' : ''}{weekChange}%
                  </span>
                </div>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Deze Maand</p>
                <p className="text-2xl font-bold">{analytics?.month_bookings || 0}</p>
                <p className="text-xs text-muted-foreground">afspraken</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Omzet (maand)</p>
                <p className="text-2xl font-bold">€{(analytics?.total_revenue || 0).toFixed(2)}</p>
                <div className="flex items-center gap-1">
                  {revenueChange > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : revenueChange < 0 ? (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  ) : null}
                  <span className={`text-xs ${
                    revenueChange > 0 ? 'text-green-600' : 
                    revenueChange < 0 ? 'text-red-600' : 
                    'text-muted-foreground'
                  }`}>
                    {revenueChange > 0 ? '+' : ''}{revenueChange}%
                  </span>
                </div>
              </div>
              <Euro className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status indicators */}
      <Card>
        <CardHeader>
          <CardTitle>Real-time Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Dashboard Updates: Live
              </Badge>
              <Badge variant="outline" className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                Booking Sync: Active
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Laatste update: {new Date().toLocaleTimeString('nl-NL')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
