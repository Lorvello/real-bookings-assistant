
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

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

interface DashboardDebugInfoProps {
  calendarId: string;
  analytics: DashboardMetrics;
}

export function DashboardDebugInfo({ calendarId, analytics }: DashboardDebugInfoProps) {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardContent className="p-4">
        <p className="text-sm text-yellow-800">
          Debug: Calendar ID: {calendarId} | 
          Vandaag: {analytics?.today_bookings} | 
          Deze week: {analytics?.week_bookings} | 
          Deze maand: {analytics?.month_bookings}
        </p>
      </CardContent>
    </Card>
  );
}
