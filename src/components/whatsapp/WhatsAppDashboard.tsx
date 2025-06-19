
import React from 'react';
import { ConversationsList } from './ConversationsList';
import { ConversationView } from './ConversationView';
import { ContactSidebar } from './ContactSidebar';

interface WhatsAppDashboardProps {
  calendarId: string;
}

export function WhatsAppDashboard({ calendarId }: WhatsAppDashboardProps) {
  return (
    <div className="h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">WhatsApp Gesprekken</h1>
        <p className="text-gray-600">Beheer je WhatsApp conversaties en berichten</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Conversations lijst */}
        <div className="lg:col-span-1">
          <ConversationsList calendarId={calendarId} />
        </div>
        
        {/* Active conversation view */}
        <div className="lg:col-span-1">
          <ConversationView />
        </div>
        
        {/* Contact info & booking history */}
        <div className="lg:col-span-1">
          <ContactSidebar />
        </div>
      </div>
    </div>
  );
}
