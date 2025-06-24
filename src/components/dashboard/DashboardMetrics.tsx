
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, Euro, TrendingUp, Info, Clock } from 'lucide-react';

interface DashboardAnalytics {
  today_bookings: number;
  pending_bookings: number;
  week_bookings: number;
  month_bookings: number;
  total_revenue: number;
  conversion_rate?: number;
  avg_response_time?: number;
  last_updated: string;
}

interface DashboardMetricsProps {
  analytics: DashboardAnalytics;
  isLoading: boolean;
  showMultiCalendarNote?: boolean;
}

export function DashboardMetrics({ analytics, isLoading, showMultiCalendarNote = false }: DashboardMetricsProps) {
  console.log('DashboardMetrics render:', { analytics, isLoading });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse bg-card/50 border-border">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-600 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-600 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-600 rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showMultiCalendarNote && (
        <Card className="border-blue-200 bg-blue-50/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-300">
              <Info className="h-4 w-4" />
              <span className="text-sm font-medium">
                Statistics are shown for the first selected calendar. 
                Combined statistics will be available soon.
              </span>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Today's Bookings */}
        <Card className="bg-card/50 border-border hover:bg-card/70 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today
            </CardTitle>
            <Calendar className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {analytics.today_bookings}
            </div>
            <p className="text-xs text-muted-foreground">
              appointments
            </p>
          </CardContent>
        </Card>

        {/* Pending Bookings */}
        <Card className="bg-card/50 border-border hover:bg-card/70 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {analytics.pending_bookings}
            </div>
            <p className="text-xs text-muted-foreground">
              awaiting confirmation
            </p>
          </CardContent>
        </Card>

        {/* Week Bookings */}
        <Card className="bg-card/50 border-border hover:bg-card/70 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Week
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {analytics.week_bookings}
            </div>
            <p className="text-xs text-muted-foreground">
              appointments
            </p>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card className="bg-card/50 border-border hover:bg-card/70 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue (Month)
            </CardTitle>
            <Euro className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              €{analytics.total_revenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Real-time indicator */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mt-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live data</span>
        </div>
        {analytics.last_updated && (
          <span>
            Last update: {new Date(analytics.last_updated).toLocaleTimeString('en-US')}
          </span>
        )}
      </div>

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="bg-gray-900/50 border-gray-700 mt-4">
          <CardContent className="p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Debug Info:</h4>
            <pre className="text-xs text-gray-400 overflow-auto">
              {JSON.stringify(analytics, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
