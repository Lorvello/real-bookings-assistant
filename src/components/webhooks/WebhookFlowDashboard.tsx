
import React from 'react';
import { CompleteWebhookTester } from './CompleteWebhookTester';
import { RealTimeWebhookMonitor } from './RealTimeWebhookMonitor';
import { WebhookTestingPanel } from './WebhookTestingPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Globe, Zap } from 'lucide-react';

interface WebhookFlowDashboardProps {
  calendarId: string;
}

export function WebhookFlowDashboard({ calendarId }: WebhookFlowDashboardProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Webhook Flow Dashboard</h2>
        <p className="text-gray-600">
          Test en monitor de complete webhook flow van database naar n8n
        </p>
      </div>

      {/* Global Processing Status */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Globe className="w-5 h-5" />
            Global Webhook Processing
            <Badge className="bg-green-500 text-white">ACTIVE</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="w-4 h-4" />
            <span>Webhook auto-processor is nu globaal actief - verwerkt webhooks automatisch ongeacht welke pagina je bezoekt</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-green-700 mt-2">
            <Zap className="w-4 h-4" />
            <span>Processing interval: 3 seconden | Real-time triggers: Enabled</span>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="flow-test" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="flow-test">
            <div className="flex items-center gap-2">
              Complete Flow Test
              <Badge variant="default" className="bg-green-500">
                ENHANCED
              </Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger value="realtime">
            Real-time Monitor
          </TabsTrigger>
          <TabsTrigger value="advanced">
            Advanced Testing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flow-test" className="mt-6">
          <CompleteWebhookTester calendarId={calendarId} />
        </TabsContent>

        <TabsContent value="realtime" className="mt-6">
          <RealTimeWebhookMonitor calendarId={calendarId} />
        </TabsContent>

        <TabsContent value="advanced" className="mt-6">
          <WebhookTestingPanel calendarId={calendarId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
