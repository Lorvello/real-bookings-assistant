
import React, { useState } from 'react';
import { ConversationsList } from './ConversationsList';
import { ConversationView } from './ConversationView';
import { ContactSidebar } from './ContactSidebar';
import { WhatsAppContactOverview } from './WhatsAppContactOverview';
import { OrphanedConversationsManager } from './OrphanedConversationsManager';
import { WebhookStatusMonitor } from '../webhooks/WebhookStatusMonitor';
import { WebhookDebugger } from '../webhooks/WebhookDebugger';
import { WebhookHealthMonitor } from '../webhooks/WebhookHealthMonitor';
import { WebhookTestingPanel } from '../webhooks/WebhookTestingPanel';
import { RealTimeWebhookMonitor } from '../webhooks/RealTimeWebhookMonitor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useWebhookProcessor } from '@/hooks/useWebhookProcessor';
import { useWebhookAutoProcessor } from '@/hooks/useWebhookAutoProcessor';

interface WhatsAppDashboardProps {
  calendarId: string;
}

export function WhatsAppDashboard({ calendarId }: WhatsAppDashboardProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  
  // Initialize enhanced webhook processor
  useWebhookProcessor(calendarId);
  
  // Start enhanced auto-processor with optimized settings
  const { isProcessing } = useWebhookAutoProcessor({ 
    calendarId, 
    enabled: true,
    intervalMs: 3000 // Faster processing - every 3 seconds
  });

  return (
    <div className="h-full">
      <Tabs defaultValue="overview" className="h-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">
            Contacten Overzicht
          </TabsTrigger>
          <TabsTrigger value="conversations">
            Live Gesprekken
          </TabsTrigger>
          <TabsTrigger value="realtime">
            <div className="flex items-center gap-2">
              Real-time Monitor
              <Badge variant="default" className="bg-green-500 animate-pulse">
                LIVE
              </Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger value="health">
            <div className="flex items-center gap-2">
              Webhook Health
              {isProcessing && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 animate-pulse">
                  Processing
                </Badge>
              )}
            </div>
          </TabsTrigger>
          <TabsTrigger value="testing">
            Enhanced Testing
          </TabsTrigger>
          <TabsTrigger value="debug">
            Webhook Debug
          </TabsTrigger>
          <TabsTrigger value="management">
            Beheer
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          <WhatsAppContactOverview calendarId={calendarId} />
        </TabsContent>
        
        <TabsContent value="conversations" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
            {/* Conversations lijst */}
            <div className="lg:col-span-1">
              <ConversationsList 
                calendarId={calendarId} 
                selectedConversationId={selectedConversationId}
                onConversationSelect={setSelectedConversationId}
              />
            </div>
            
            {/* Active conversation view */}
            <div className="lg:col-span-1">
              <ConversationView conversationId={selectedConversationId} />
            </div>
            
            {/* Contact info & booking history */}
            <div className="lg:col-span-1">
              <ContactSidebar conversationId={selectedConversationId} />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="realtime" className="mt-6">
          <RealTimeWebhookMonitor calendarId={calendarId} />
        </TabsContent>
        
        <TabsContent value="health" className="mt-6">
          <WebhookHealthMonitor calendarId={calendarId} />
        </TabsContent>
        
        <TabsContent value="testing" className="mt-6">
          <WebhookTestingPanel calendarId={calendarId} />
        </TabsContent>
        
        <TabsContent value="debug" className="mt-6">
          <WebhookDebugger calendarId={calendarId} />
        </TabsContent>
        
        <TabsContent value="management" className="mt-6">
          <div className="space-y-6">
            <OrphanedConversationsManager />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
