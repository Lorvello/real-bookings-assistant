
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
  Phone,
  CheckCircle,
  Activity
} from 'lucide-react';
import { DashboardMetrics } from '@/hooks/useDashboardAnalytics';

interface EnhancedDashboardMetricsProps {
  analytics: DashboardMetrics;
}

export function EnhancedDashboardMetrics({ analytics }: EnhancedDashboardMetricsProps) {
  const metricCards = [
    {
      title: 'Vandaag',
      value: analytics.today_bookings,
      icon: Calendar,
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
      suffix: analytics.today_bookings === 1 ? ' afspraak' : ' afspraken',
      subtitle: analytics.pending_bookings > 0 ? `${analytics.pending_bookings} wachtend` : 'Alles bevestigd'
    },
    {
      title: 'Deze Week',
      value: analytics.week_bookings,
      icon: Users,
      color: 'text-green-400',
      bgColor: 'bg-green-900/20',
      suffix: analytics.week_bookings === 1 ? ' afspraak' : ' afspraken',
      subtitle: 'Bevestigd'
    },
    {
      title: 'Maand Omzet',
      value: `€${analytics.total_revenue.toFixed(2)}`,
      icon: Euro,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-900/20',
      suffix: '',
      subtitle: `${analytics.month_bookings} afspraken`
    },
    {
      title: 'WhatsApp Conversaties',
      value: analytics.whatsapp_conversations,
      icon: MessageSquare,
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/20',
      suffix: ' actief',
      subtitle: `${analytics.whatsapp_messages_today} berichten vandaag`
    },
    {
      title: 'WhatsApp Conversie',
      value: `${analytics.conversion_rate}%`,
      icon: TrendingUp,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-900/20',
      suffix: '',
      subtitle: 'Chat naar booking'
    },
    {
      title: 'Respons Tijd',
      value: analytics.avg_response_time > 0 ? `${analytics.avg_response_time.toFixed(1)}min` : 'Real-time',
      icon: Clock,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-900/20',
      suffix: '',
      subtitle: analytics.avg_response_time > 0 ? 'Gemiddeld' : 'AI Bot actief'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Real-time indicator */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>Live data - inclusief WhatsApp statistieken</span>
        {analytics.last_updated && (
          <span className="ml-2">
            (laatste update: {new Date(analytics.last_updated).toLocaleTimeString('nl-NL')})
          </span>
        )}
      </div>

      {/* Enhanced Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  <span className="text-sm font-normal text-gray-400">{metric.suffix}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
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
            WhatsApp Bot Actief
          </Badge>
          <Badge variant="outline" className="border-blue-600 text-blue-400">
            <Activity className="h-3 w-3 mr-1" />
            {analytics.whatsapp_conversations} Active Chats
          </Badge>
        </div>
      )}
    </div>
  );
}
