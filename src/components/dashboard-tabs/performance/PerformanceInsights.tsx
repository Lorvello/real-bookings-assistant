
import React from 'react';
import { Clock, AlertTriangle, Calendar, TrendingUp, Target, Users } from 'lucide-react';

interface PerformanceInsightsProps {
  avgResponseTime?: number;
  noShowRate?: number;
  cancellationRate?: number;
  calendarUtilization?: number;
}

export function PerformanceInsights({ 
  avgResponseTime, 
  noShowRate, 
  cancellationRate, 
  calendarUtilization 
}: PerformanceInsightsProps) {
  const getResponseTimeInsight = () => {
    if (!avgResponseTime) return "No response time data available yet.";
    if (avgResponseTime < 5) return "Excellent response time! Customers get quick replies.";
    if (avgResponseTime < 15) return "Good response time, but there's room for improvement.";
    return "Response time could be improved for better customer satisfaction.";
  };

  const getNoShowInsight = () => {
    if (noShowRate === undefined) return "No no-show data available yet.";
    if (noShowRate < 5) return "Low no-show rate shows strong customer engagement.";
    if (noShowRate < 15) return "Average no-show rate, consider sending reminders.";
    return "High no-show rate, strengthen your reminder system.";
  };

  const getCancellationInsight = () => {
    if (cancellationRate === undefined) return "No cancellation data available yet.";
    if (cancellationRate < 10) return "Low cancellation rate shows satisfied customers.";
    if (cancellationRate < 25) return "Average cancellation rate, monitor trends.";
    return "High cancellation rate, analyze possible causes.";
  };

  const getUtilizationInsight = () => {
    if (calendarUtilization === undefined) return "No utilization data available yet.";
    if (calendarUtilization > 80) return "High calendar utilization - consider adding capacity.";
    if (calendarUtilization > 60) return "Good calendar utilization with room to grow.";
    return "Calendar utilization could be improved with marketing.";
  };

  const insights = [
    {
      title: "Response Time Optimization",
      insight: getResponseTimeInsight(),
      icon: Clock,
      variant: "blue" as const
    },
    {
      title: "No-show Prevention",
      insight: getNoShowInsight(),
      icon: AlertTriangle,
      variant: "blue" as const
    },
    {
      title: "Cancellation Management",
      insight: getCancellationInsight(),
      icon: Users,
      variant: "blue" as const
    },
    {
      title: "Capacity Optimization",
      insight: getUtilizationInsight(),
      icon: Target,
      variant: "green" as const
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {insights.map((item, index) => (
        <div
          key={item.title}
          className="p-6 bg-muted/40 border border-white/[0.08] rounded-xl"
          style={{
            animation: `fadeIn 0.6s ease-out ${index * 0.1}s both`
          }}
        >
          <h4 className="font-semibold mb-3 flex items-center gap-2 text-foreground">
            <item.icon className="h-5 w-5 text-subtle-foreground" />
            {item.title}
          </h4>
          <p className="text-foreground text-sm leading-relaxed">
            {item.insight}
          </p>
        </div>
      ))}
    </div>
  );
}
