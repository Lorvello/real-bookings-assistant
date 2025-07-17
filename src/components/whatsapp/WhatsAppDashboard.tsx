
import React, { useState } from 'react';
import { ConversationsList } from './ConversationsList';
import { ConversationView } from './ConversationView';
import { ContactSidebar } from './ContactSidebar';
import { WhatsAppContactOverview } from './WhatsAppContactOverview';
import { OrphanedConversationsManager } from './OrphanedConversationsManager';
import { WebhookFlowDashboard } from '../webhooks/WebhookFlowDashboard';
import { WebhookHealthMonitor } from '../webhooks/WebhookHealthMonitor';
import { WhatsAppServiceStatus } from './WhatsAppServiceStatus';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useWebhookProcessor } from '@/hooks/useWebhookProcessor';
import { useDeveloperAccess } from '@/hooks/useDeveloperAccess';

interface WhatsAppDashboardProps {
  calendarId: string;
}

export function WhatsAppDashboard({ calendarId }: WhatsAppDashboardProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const { isDeveloper } = useDeveloperAccess();
  
  // Initialize enhanced webhook processor
  useWebhookProcessor(calendarId);

  return (
    <div className="h-full">
      {/* Service Status Indicator */}
      <WhatsAppServiceStatus calendarId={calendarId} />
      
      <Tabs defaultValue="overview" className="h-full">
        <TabsList className={`grid w-full ${isDeveloper ? 'grid-cols-5' : 'grid-cols-3'}`}>
          <TabsTrigger value="overview">
            Contacten Overzicht
          </TabsTrigger>
          <TabsTrigger value="conversations">
            Live Gesprekken
          </TabsTrigger>
          {isDeveloper && (
            <TabsTrigger value="webhook-flow">
              <div className="flex items-center gap-2">
                Webhook Flow
                <Badge variant="default" className="bg-green-500">
                  GLOBAL
                </Badge>
              </div>
            </TabsTrigger>
          )}
          {isDeveloper && (
            <TabsTrigger value="health">
              <div className="flex items-center gap-2">
                System Health
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Monitoring
                </Badge>
              </div>
            </TabsTrigger>
          )}
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
        
        {isDeveloper && (
          <TabsContent value="webhook-flow" className="mt-6">
            <WebhookFlowDashboard calendarId={calendarId} />
          </TabsContent>
        )}
        
        {isDeveloper && (
          <TabsContent value="health" className="mt-6">
            <WebhookHealthMonitor calendarId={calendarId} />
          </TabsContent>
        )}
        
        <TabsContent value="management" className="mt-6">
          <div className="space-y-6">
            <OrphanedConversationsManager />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
