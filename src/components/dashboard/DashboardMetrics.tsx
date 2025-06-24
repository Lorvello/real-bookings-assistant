
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Euro, TrendingUp, Users, MessageSquare } from 'lucide-react';
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics';

export const DashboardMetrics = () => {
  const { metrics, loading, error, hasCalendar } = useDashboardAnalytics();

  if (!hasCalendar) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">Selecteer een kalender om metrics te bekijken</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="bg-gray-800/50 border-gray-700 animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-700 rounded mb-2"></div>
              <div className="h-8 bg-gray-700 rounded"></div>
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
      title: 'Vandaag',
      value: metrics.today_bookings,
      icon: Calendar,
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
      suffix: metrics.today_bookings === 1 ? ' afspraak' : ' afspraken'
    },
    {
      title: 'Wachtend',
      value: metrics.pending_bookings,
      icon: Clock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-900/20',
      suffix: metrics.pending_bookings === 1 ? ' afspraak' : ' afspraken'
    },
    {
      title: 'Deze Week',
      value: metrics.week_bookings,
      icon: TrendingUp,
      color: 'text-green-400',
      bgColor: 'bg-green-900/20',
      suffix: metrics.week_bookings === 1 ? ' afspraak' : ' afspraken'
    },
    {
      title: 'Deze Maand',
      value: metrics.month_bookings,
      icon: Users,
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/20',
      suffix: metrics.month_bookings === 1 ? ' afspraak' : ' afspraken'
    },
    {
      title: 'Omzet',
      value: `€${metrics.total_revenue.toFixed(2)}`,
      icon: Euro,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-900/20',
      suffix: ' deze maand'
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
          <Card key={index} className={`${metric.bgColor} border-gray-700 hover:scale-105 transition-transform duration-200`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                {metric.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {typeof metric.value === 'string' ? metric.value : metric.value.toLocaleString()}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {metric.suffix}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
