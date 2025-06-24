
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Clock, MessageSquare, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';

interface ContactSidebarProps {
  conversationId: string | null;
}

export function ContactSidebar({ conversationId }: ContactSidebarProps) {
  const { data: conversation } = useQuery({
    queryKey: ['whatsapp-conversation-detail', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          whatsapp_contacts (
            id,
            phone_number,
            display_name,
            first_name,
            last_name,
            profile_picture_url,
            last_seen_at
          )
        `)
        .eq('id', conversationId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });

  const { data: messageStats } = useQuery({
    queryKey: ['whatsapp-message-stats', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('id, direction, created_at')
        .eq('conversation_id', conversationId);
      
      if (error) throw error;
      
      const total = data?.length || 0;
      const inbound = data?.filter(m => m.direction === 'inbound').length || 0;
      const outbound = data?.filter(m => m.direction === 'outbound').length || 0;
      
      // Calculate conversation duration
      const messages = data?.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const firstMessage = messages?.[0];
      const lastMessage = messages?.[messages.length - 1];
      
      let duration = 'Geen berichten';
      if (firstMessage && lastMessage && messages.length > 1) {
        const start = new Date(firstMessage.created_at);
        const end = new Date(lastMessage.created_at);
        const diffMs = end.getTime() - start.getTime();
        const diffMins = Math.round(diffMs / (1000 * 60));
        duration = diffMins > 60 ? `${Math.round(diffMins / 60)} uur` : `${diffMins} min`;
      }
      
      return { total, inbound, outbound, duration };
    },
    enabled: !!conversationId,
  });

  if (!conversationId) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Select a conversation to view contact information</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const contact = conversation?.whatsapp_contacts;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-gray-900">Contact Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-xl font-medium text-blue-600">
              {contact?.display_name?.[0] || contact?.first_name?.[0] || '?'}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900">
            {contact?.display_name || 
             `${contact?.first_name || ''} ${contact?.last_name || ''}`.trim() || 
             'Unknown contact'}
          </h3>
        </div>
        
        <div className="space-y-3">
          {contact?.phone_number && (
            <div className="flex items-center gap-3 text-gray-700">
              <Phone className="h-4 w-4 text-gray-400" />
              <span className="text-sm">{contact.phone_number}</span>
            </div>
          )}
          
          {contact?.last_seen_at && (
            <div className="flex items-center gap-3 text-gray-700">
              <Clock className="h-4 w-4 text-gray-400" />
              <div className="text-sm">
                <p>Last seen:</p>
                <p className="text-gray-500">
                  {formatDistanceToNow(new Date(contact.last_seen_at), { 
                    addSuffix: true, 
                    locale: nl 
                  })}
                </p>
              </div>
            </div>
          )}
          
          {conversation?.status && (
            <div className="flex items-center gap-3 text-gray-700">
              <MessageSquare className="h-4 w-4 text-gray-400" />
              <div className="flex items-center gap-2">
                <span className="text-sm">Status:</span>
                <Badge 
                  variant={conversation.status === 'active' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {conversation.status}
                </Badge>
              </div>
            </div>
          )}
        </div>

        {messageStats && (
          <div className="pt-4 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-2">Conversation Statistics</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Total messages:</span>
                <span className="font-medium">{messageStats.total}</span>
              </div>
              <div className="flex justify-between">
                <span>Incoming messages:</span>
                <span className="font-medium">{messageStats.inbound}</span>
              </div>
              <div className="flex justify-between">
                <span>Outgoing messages:</span>
                <span className="font-medium">{messageStats.outbound}</span>
              </div>
              <div className="flex justify-between">
                <span>Conversation duration:</span>
                <span className="font-medium">{messageStats.duration}</span>
              </div>
            </div>
          </div>
        )}

        {conversation?.created_at && (
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center gap-3 text-gray-700">
              <Calendar className="h-4 w-4 text-gray-400" />
              <div className="text-sm">
                <p>Conversation started:</p>
                <p className="text-gray-500">
                  {formatDistanceToNow(new Date(conversation.created_at), { 
                    addSuffix: true, 
                    locale: nl 
                  })}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
