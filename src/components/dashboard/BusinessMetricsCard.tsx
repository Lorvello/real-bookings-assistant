
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Users, TrendingUp, MessageSquare, CheckCircle, Calendar } from 'lucide-react';
import { useBusinessMetrics } from '@/hooks/useBusinessMetrics';
import { useAuth } from '@/hooks/useAuth';

export const BusinessMetricsCard = () => {
  const { user } = useAuth();
  const { aggregatedMetrics, loading } = useBusinessMetrics(user);

  const metrics = [
    { 
      label: 'Total Clients', 
      value: aggregatedMetrics.totalClients.toString(), 
      icon: Users,
      color: 'text-blue-600'
    },
    { 
      label: 'New This Week', 
      value: aggregatedMetrics.newThisWeek.toString(), 
      icon: TrendingUp,
      color: 'text-green-600'
    },
    { 
      label: 'Avg Response', 
      value: aggregatedMetrics.avgResponse, 
      icon: MessageSquare,
      color: 'text-purple-600'
    },
    { 
      label: 'Success Rate', 
      value: aggregatedMetrics.successRate, 
      icon: CheckCircle,
      color: 'text-emerald-600'
    },
    { 
      label: 'This Month', 
      value: aggregatedMetrics.thisMonth.toString(), 
      icon: Calendar,
      color: 'text-orange-600'
    },
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-green-600" />
            Business Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Loading business metrics...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-green-600" />
          Business Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {metrics.map((metric, index) => {
            const IconComponent = metric.icon;
            return (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-2">
                  <IconComponent className={`h-5 w-5 ${metric.color}`} />
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {metric.value}
                </div>
                <div className="text-sm text-gray-600">{metric.label}</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
