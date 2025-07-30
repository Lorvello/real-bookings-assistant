
import React, { useState } from 'react';
import { ConversationsList } from './ConversationsList';
import { ConversationView } from './ConversationView';
import { ContactSidebar } from './ContactSidebar';
import { WhatsAppContactOverview } from './WhatsAppContactOverview';
import { ConversationManagement } from './ConversationManagement';
import { WebhookFlowDashboard } from '../webhooks/WebhookFlowDashboard';
import { WebhookHealthMonitor } from '../webhooks/WebhookHealthMonitor';
import { WhatsAppServiceStatus } from './WhatsAppServiceStatus';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useWebhookProcessor } from '@/hooks/useWebhookProcessor';
import { useDeveloperAccess } from '@/hooks/useDeveloperAccess';
import { useWhatsAppLimits } from '@/hooks/useSubscriptionLimits';
import { useAccessControl } from '@/hooks/useAccessControl';
import { UpgradePrompt } from '@/components/ui/UpgradePrompt';
import { MessageCircle } from 'lucide-react';

interface WhatsAppDashboardProps {
  calendarId: string;
}

export function WhatsAppDashboard({ calendarId }: WhatsAppDashboardProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const { isDeveloper } = useDeveloperAccess();
  const { currentCount, maxContacts, canAddMore } = useWhatsAppLimits(calendarId);
  const { accessControl } = useAccessControl();
  
  // Initialize enhanced webhook processor
  useWebhookProcessor(calendarId);

  return (
    <div className="h-full">
      {/* Service Status Indicator */}
      <WhatsAppServiceStatus calendarId={calendarId} />
      
      {/* WhatsApp Contact Limit Warning */}
      {!canAddMore && accessControl.canAccessWhatsApp && (
        <div className="mb-4">
          <UpgradePrompt 
            feature="WhatsApp Contacts"
            currentUsage={`${currentCount}/${maxContacts}`}
            limit={`${maxContacts} contact${maxContacts === 1 ? '' : 's'}`}
            description="You've reached your WhatsApp contact limit. Upgrade to Professional to manage unlimited contacts."
          />
        </div>
      )}
      
      {/* Usage indicator for contacts */}
      {canAddMore && maxContacts !== null && (
        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageCircle className="h-4 w-4" />
            <span>WhatsApp contacts: {currentCount}/{maxContacts}</span>
          </div>
        </div>
      )}
      
      <Tabs defaultValue="overview" className="h-full">
        <div className="overflow-x-auto">
          <TabsList className={`flex md:grid w-max md:w-full ${isDeveloper ? 'md:grid-cols-5' : 'md:grid-cols-3'} bg-muted p-1`}>
            <TabsTrigger value="overview" className="whitespace-nowrap">
              Contact Overview
            </TabsTrigger>
            <TabsTrigger value="conversations" className="whitespace-nowrap">
              Live Conversations
            </TabsTrigger>
            {isDeveloper && (
              <TabsTrigger value="webhook-flow" className="whitespace-nowrap">
                <div className="flex items-center gap-2">
                  Webhook Flow
                  <Badge variant="default" className="bg-green-500">
                    GLOBAL
                  </Badge>
                </div>
              </TabsTrigger>
            )}
            {isDeveloper && (
              <TabsTrigger value="health" className="whitespace-nowrap">
                <div className="flex items-center gap-2">
                  System Health
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Monitoring
                  </Badge>
                </div>
              </TabsTrigger>
            )}
            <TabsTrigger value="management" className="whitespace-nowrap">
              Conversation Management
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="overview" className="mt-6">
          <WhatsAppContactOverview calendarId={calendarId} />
        </TabsContent>
        
        <TabsContent value="conversations" className="mt-4 md:mt-6">
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-3 md:gap-6 h-[calc(100vh-200px)]">
            {/* Conversations list - Stack on mobile */}
            <div className="lg:col-span-1 h-60 lg:h-auto">
              <ConversationsList 
                calendarId={calendarId} 
                selectedConversationId={selectedConversationId}
                onConversationSelect={setSelectedConversationId}
              />
            </div>
            
            {/* Active conversation view - Stack on mobile */}
            <div className="lg:col-span-1 h-60 lg:h-auto">
              <ConversationView conversationId={selectedConversationId} />
            </div>
            
            {/* Contact info & booking history - Stack on mobile */}
            <div className="lg:col-span-1 h-60 lg:h-auto">
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
            <ConversationManagement />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
