
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Calendar, Euro, Users } from 'lucide-react';

interface DashboardMetrics {
  today_bookings: number;
  pending_bookings: number;
  week_bookings: number;
  month_bookings: number;
  total_revenue: number;
  conversion_rate: number;
  avg_response_time: number;
  last_updated: string;
  prev_week_bookings?: number;
  prev_month_revenue?: number;
  prev_week_response_time?: number;
  prev_week_customers?: number;
}

interface DashboardMetricsCardsProps {
  analytics: DashboardMetrics;
}

export function DashboardMetricsCards({ analytics }: DashboardMetricsCardsProps) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Today</p>
              <p className="text-2xl font-bold">{analytics?.today_bookings || 0}</p>
              <p className="text-xs text-muted-foreground">
                {analytics?.pending_bookings || 0} pending
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
  );
}
