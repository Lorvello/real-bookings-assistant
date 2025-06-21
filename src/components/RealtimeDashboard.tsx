
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
  
  const { data: analytics, isLoading } = useDashboardAnalytics(calendarId);

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
      </div>

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
              <Euro className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Reactietijd</p>
                <p className="text-2xl font-bold">
                  {(analytics?.avg_response_time || 0).toFixed(1)}min
                </p>
                <p className="text-xs text-muted-foreground">
                  WhatsApp gemiddeld
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
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
