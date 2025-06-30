
import React from 'react';
import { CompleteWebhookTester } from './CompleteWebhookTester';
import { RealTimeWebhookMonitor } from './RealTimeWebhookMonitor';
import { WebhookTestingPanel } from './WebhookTestingPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

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

      <Tabs defaultValue="flow-test" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="flow-test">
            <div className="flex items-center gap-2">
              Complete Flow Test
              <Badge variant="default" className="bg-green-500">
                NEW
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
