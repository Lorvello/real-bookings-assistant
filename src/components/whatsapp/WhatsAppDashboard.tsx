
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWebhookProcessor } from '@/hooks/useWebhookProcessor';
import { useWebhookAutoProcessor } from '@/hooks/useWebhookAutoProcessor';

interface WhatsAppDashboardProps {
  calendarId: string;
}

export function WhatsAppDashboard({ calendarId }: WhatsAppDashboardProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  
  // Initialize enhanced webhook processor
  useWebhookProcessor(calendarId);
  
  // Start enhanced auto-processor for real-time webhook processing
  useWebhookAutoProcessor({ 
    calendarId, 
    enabled: true,
    intervalMs: 5000 // Check every 5 seconds for faster processing
  });

  return (
    <div className="h-full">
      <Tabs defaultValue="overview" className="h-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Contacten Overzicht</TabsTrigger>
          <TabsTrigger value="conversations">Live Gesprekken</TabsTrigger>
          <TabsTrigger value="health">Webhook Health</TabsTrigger>
          <TabsTrigger value="testing">Webhook Testing</TabsTrigger>
          <TabsTrigger value="debug">Webhook Debug</TabsTrigger>
          <TabsTrigger value="management">Beheer</TabsTrigger>
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
