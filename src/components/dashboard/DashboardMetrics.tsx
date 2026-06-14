
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Euro, TrendingUp, Users, MessageSquare } from 'lucide-react';
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics';

export const DashboardMetrics = () => {
  const { metrics, loading, error, hasCalendar } = useDashboardAnalytics();

  if (!hasCalendar) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="bg-card/50 border-white/[0.08]">
          <CardContent className="p-6 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Select a calendar to view metrics</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="bg-card/50 border-white/[0.08] animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-8 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-8">
        <Card className="bg-red-900/20 border-red-700">
          <CardContent className="p-6 text-center">
            <p className="text-red-400">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const metricCards = [
    {
      title: 'Today',
      value: metrics.today_bookings,
      icon: Calendar,
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
      suffix: metrics.today_bookings === 1 ? ' appointment' : ' appointments'
    },
    {
      title: 'Pending',
      value: metrics.pending_bookings,
      icon: Clock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-900/20',
      suffix: metrics.pending_bookings === 1 ? ' appointment' : ' appointments'
    },
    {
      title: 'This Week',
      value: metrics.week_bookings,
      icon: TrendingUp,
      color: 'text-green-400',
      bgColor: 'bg-green-900/20',
      suffix: metrics.week_bookings === 1 ? ' appointment' : ' appointments'
    },
    {
      title: 'This Month',
      value: metrics.month_bookings,
      icon: Users,
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/20',
      suffix: metrics.month_bookings === 1 ? ' appointment' : ' appointments'
    },
    {
      title: 'Revenue',
      value: `€${metrics.total_revenue.toFixed(2)}`,
      icon: Euro,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-900/20',
      suffix: ' this month'
    },
    {
      title: 'Conversie',
      value: `${metrics.conversion_rate}%`,
      icon: MessageSquare,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-900/20',
      suffix: ' WhatsApp'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {metricCards.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card key={index} className={`${metric.bgColor} border-white/[0.08] hover:scale-105 transition-transform duration-200`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">
                {metric.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {typeof metric.value === 'string' ? metric.value : metric.value.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metric.suffix}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
