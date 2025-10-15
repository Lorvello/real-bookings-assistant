
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  Euro, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Phone, 
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface MetricsData {
  today_bookings: number;
  pending_bookings: number;
  week_bookings: number;
  month_bookings: number;
  total_revenue: number;
  conversion_rate: number;
  avg_response_time: number;
  prev_week_bookings?: number;
  prev_month_revenue?: number;
}

interface EnhancedMetricsCardsProps {
  analytics: MetricsData;
}

export function EnhancedMetricsCards({ analytics }: EnhancedMetricsCardsProps) {
  const weekTrend = analytics.prev_week_bookings 
    ? ((analytics.week_bookings - analytics.prev_week_bookings) / analytics.prev_week_bookings) * 100
    : 0;

  const revenueTrend = analytics.prev_month_revenue 
    ? ((analytics.total_revenue - analytics.prev_month_revenue) / analytics.prev_month_revenue) * 100
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Vandaag Bookings */}
      <Card className="border-border/60 bg-gradient-to-br from-card to-card/80 hover:shadow-lg transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Vandaag
          </CardTitle>
          <Calendar className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {analytics.today_bookings}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {analytics.pending_bookings > 0 && (
              <span className="text-orange-600">
                {analytics.pending_bookings} pending
              </span>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Week Bookings met trend */}
      <Card className="border-border/60 bg-gradient-to-br from-card to-card/80 hover:shadow-lg transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Deze Week
          </CardTitle>
          <div className="flex items-center gap-1">
            {weekTrend !== 0 && (
              weekTrend > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )
            )}
            <Users className="h-4 w-4 text-green-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {analytics.week_bookings}
          </div>
          {weekTrend !== 0 && (
            <p className={`text-xs mt-1 ${weekTrend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {weekTrend > 0 ? '+' : ''}{weekTrend.toFixed(1)}% vs vorige week
            </p>
          )}
        </CardContent>
      </Card>

      {/* Omzet met trend */}
      <Card className="border-border/60 bg-gradient-to-br from-card to-card/80 hover:shadow-lg transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Maand Omzet
          </CardTitle>
          <div className="flex items-center gap-1">
            {revenueTrend !== 0 && (
              revenueTrend > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )
            )}
            <Euro className="h-4 w-4 text-green-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            €{analytics.total_revenue.toFixed(2)}
          </div>
          {revenueTrend !== 0 && (
            <p className={`text-xs mt-1 ${revenueTrend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {revenueTrend > 0 ? '+' : ''}{revenueTrend.toFixed(1)}% vs vorige maand
            </p>
          )}
        </CardContent>
      </Card>

      {/* Response Time & Status */}
      <Card className="border-border/60 bg-gradient-to-br from-card to-card/80 hover:shadow-lg transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Respons Tijd
          </CardTitle>
          <Clock className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {analytics.avg_response_time.toFixed(1)}s
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Badge variant="outline" className="text-xs">
              <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
              Real-time
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
