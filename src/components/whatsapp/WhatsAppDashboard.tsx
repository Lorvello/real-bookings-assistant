
import React, { useState } from 'react';
import { ConversationsList } from './ConversationsList';
import { ConversationView } from './ConversationView';
import { ContactSidebar } from './ContactSidebar';

interface WhatsAppDashboardProps {
  calendarId: string;
}

export function WhatsAppDashboard({ calendarId }: WhatsAppDashboardProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  return (
    <div className="h-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-400px)]">
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
    </div>
  );
}
