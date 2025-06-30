
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, User, Clock } from 'lucide-react';
import { useWhatsAppConversations } from '@/hooks/useWhatsAppConversations';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface ConversationsListProps {
  calendarId: string;
  selectedConversationId: string | null;
  onConversationSelect: (conversationId: string) => void;
}

export function ConversationsList({
  calendarId,
  selectedConversationId,
  onConversationSelect,
}: ConversationsListProps) {
  const { data: conversations, isLoading } = useWhatsAppConversations(calendarId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Gesprekken
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Actief</Badge>;
      case 'closed':
        return <Badge variant="secondary">Gesloten</Badge>;
      case 'archived':
        return <Badge variant="outline">Gearchiveerd</Badge>;
      default:
        return <Badge variant="outline">Onbekend</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Gesprekken ({conversations?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!conversations || conversations.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Geen gesprekken gevonden</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conversation) => {
              const contact = conversation.whatsapp_contacts;
              const displayName = contact?.display_name || 
                `${contact?.first_name || ''} ${contact?.last_name || ''}`.trim() || 
                'Onbekend contact';
              
              const isSelected = selectedConversationId === conversation.id;

              return (
                <div
                  key={conversation.id}
                  onClick={() => onConversationSelect(conversation.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-blue-50 border border-blue-200' 
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{displayName}</h4>
                        <p className="text-xs text-gray-500">{contact?.phone_number}</p>
                      </div>
                    </div>
                    {getStatusBadge(conversation.status)}
                  </div>
                  
                  {conversation.last_message_at && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>
                        {format(new Date(conversation.last_message_at), 'dd MMM HH:mm', { locale: nl })}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
