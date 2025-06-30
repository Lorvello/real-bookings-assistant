
import React, { useState } from 'react';
import { ConversationsList } from './ConversationsList';
import { ConversationView } from './ConversationView';
import { ContactSidebar } from './ContactSidebar';
import { WhatsAppContactOverview } from './WhatsAppContactOverview';
import { OrphanedConversationsManager } from './OrphanedConversationsManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface WhatsAppDashboardProps {
  calendarId: string;
}

export function WhatsAppDashboard({ calendarId }: WhatsAppDashboardProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  return (
    <div className="h-full">
      <Tabs defaultValue="overview" className="h-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Contacten Overzicht</TabsTrigger>
          <TabsTrigger value="conversations">Live Gesprekken</TabsTrigger>
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
        
        <TabsContent value="management" className="mt-6">
          <div className="space-y-6">
            <OrphanedConversationsManager />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
