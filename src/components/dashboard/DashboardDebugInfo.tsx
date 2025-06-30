
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Code, Database, MessageSquare } from 'lucide-react';
import { DashboardMetrics } from '@/hooks/useDashboardAnalytics';

interface DashboardDebugInfoProps {
  calendarId: string;
  analytics: DashboardMetrics;
}

export function DashboardDebugInfo({ calendarId, analytics }: DashboardDebugInfoProps) {
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-300">
          <Code className="w-4 h-4" />
          Debug Info (Development Only)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Calendar ID:</p>
            <p className="text-white font-mono text-xs break-all">{calendarId}</p>
          </div>
          <div>
            <p className="text-gray-400">Last Updated:</p>
            <p className="text-white">{new Date(analytics.last_updated).toLocaleString('nl-NL')}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-blue-600 text-blue-400">
            <Database className="w-3 h-3 mr-1" />
            Dashboard Metrics Active
          </Badge>
          <Badge variant="outline" className="border-green-600 text-green-400">
            <MessageSquare className="w-3 h-3 mr-1" />
            WhatsApp: {analytics.whatsapp_conversations} conversaties
          </Badge>
          <Badge variant="outline" className="border-purple-600 text-purple-400">
            Conversie: {analytics.conversion_rate}%
          </Badge>
          <Badge variant="outline" className="border-cyan-600 text-cyan-400">
            Respons: {analytics.avg_response_time}min
          </Badge>
        </div>

        <div className="text-xs text-gray-500">
          <p>✅ Real-time updates enabled</p>
          <p>✅ WhatsApp analytics integration active</p>
          <p>✅ Dashboard metrics function: get_dashboard_metrics</p>
          <p>📊 Messages today: {analytics.whatsapp_messages_today}</p>
        </div>
      </CardContent>
    </Card>
  );
}
