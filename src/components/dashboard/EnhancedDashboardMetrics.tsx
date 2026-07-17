
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  Euro, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Activity
} from 'lucide-react';
import type { DashboardMetrics } from '@/hooks/useDashboardAnalytics';

interface EnhancedDashboardMetricsProps {
  analytics: DashboardMetrics;
}

const formatRetainedRevenue = (analytics: DashboardMetrics) => {
  if (analytics.total_revenue_status === 'mixed_currencies') {
    return 'Mixed currencies';
  }
  if (analytics.total_revenue_status === 'no_retained_revenue') {
    return 'No revenue';
  }
  if (
    analytics.total_revenue_status !== 'single_currency' ||
    analytics.total_revenue === null ||
    analytics.total_revenue_currency === null
  ) {
    return 'Unavailable';
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: analytics.total_revenue_currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(analytics.total_revenue);
  } catch {
    return `${analytics.total_revenue_currency.toUpperCase()} ${analytics.total_revenue.toFixed(2)}`;
  }
};

const revenueSubtitle = (analytics: DashboardMetrics) => {
  switch (analytics.total_revenue_status) {
    case 'single_currency':
      return `${analytics.total_revenue_currency?.toUpperCase()} retained after refunds · appointments this month`;
    case 'mixed_currencies':
      return 'Cannot total multiple currencies';
    case 'no_retained_revenue':
      return 'No retained revenue for this month’s appointments';
    default:
      return 'Revenue metadata unavailable';
  }
};

export function EnhancedDashboardMetrics({ analytics }: EnhancedDashboardMetricsProps) {
  const hasResponseSamples = analytics.avg_response_time_sample_count > 0 &&
    analytics.avg_response_time !== null;

  const metricCards = [
    {
      title: 'Today',
      value: analytics.today_bookings,
      icon: Calendar,
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
      suffix: analytics.today_bookings === 1 ? ' appointment' : ' appointments',
      subtitle: analytics.pending_bookings > 0
        ? `${analytics.pending_bookings} pending today`
        : 'No pending appointments today'
    },
    {
      title: 'This Week',
      value: analytics.week_bookings,
      icon: Users,
      color: 'text-green-400',
      bgColor: 'bg-green-900/20',
      suffix: analytics.week_bookings === 1 ? ' appointment' : ' appointments',
      subtitle: 'Confirmed appointments only'
    },
    {
      title: 'Retained Revenue',
      value: formatRetainedRevenue(analytics),
      icon: Euro,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-900/20',
      suffix: '',
      subtitle: revenueSubtitle(analytics)
    },
    {
      title: 'WhatsApp Conversations',
      value: analytics.whatsapp_conversations,
      icon: MessageSquare,
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/20',
      suffix: ' active',
      subtitle: `${analytics.whatsapp_messages_today} messages today`
    },
    {
      title: 'Contacts Later Booked',
      value: analytics.contacts_later_booked,
      icon: TrendingUp,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-900/20',
      suffix: '',
      subtitle: `${analytics.contacts_later_booked_sample_count} recent contacts · phone/email match`
    },
    {
      title: 'Response Time',
      value: hasResponseSamples
        ? `${analytics.avg_response_time!.toFixed(1)}min`
        : 'No data',
      icon: Clock,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-900/20',
      suffix: '',
      subtitle: hasResponseSamples ? 'Average' : 'No delivered replies yet'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Refresh timestamp; realtime subscriptions cover only selected sources. */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span>Current calendar metrics</span>
        {analytics.last_updated && (
          <span className="ml-2">
            (refreshed: {new Date(analytics.last_updated).toLocaleTimeString('en-US')})
          </span>
        )}
      </div>

      {/* Enhanced Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  <span className="text-sm font-normal text-muted-foreground">{metric.suffix}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metric.subtitle}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* WhatsApp Status Badge */}
      {analytics.whatsapp_conversations > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-green-600 text-green-400">
            <MessageSquare className="h-3 w-3 mr-1" />
            WhatsApp activity present
          </Badge>
          <Badge variant="outline" className="border-blue-600 text-blue-400">
            <Activity className="h-3 w-3 mr-1" />
            {analytics.whatsapp_conversations} active conversations
          </Badge>
        </div>
      )}
    </div>
  );
}
