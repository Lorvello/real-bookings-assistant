
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, MessageCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useWhatsAppRealtimeUpdates } from '@/hooks/useWhatsAppRealtimeUpdates';

interface ConversationsListProps {
  calendarId: string;
  selectedConversationId: string | null;
  onConversationSelect: (id: string | null) => void;
}

export function ConversationsList({ 
  calendarId, 
  selectedConversationId, 
  onConversationSelect 
}: ConversationsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');

  // Enable real-time updates
  useWhatsAppRealtimeUpdates();

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['whatsapp-conversations', calendarId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          whatsapp_contacts!inner (
            id,
            phone_number,
            display_name,
            first_name,
            last_name,
            profile_picture_url
          )
        `)
        .eq('calendar_id', calendarId)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!calendarId,
  });

  const { data: messageCounts } = useQuery({
    queryKey: ['whatsapp-message-counts', calendarId],
    queryFn: async () => {
      if (!conversations) return {};
      
      const conversationIds = conversations.map(c => c.id);
      if (conversationIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('conversation_id, direction')
        .in('conversation_id', conversationIds);
      
      if (error) throw error;
      
      const counts: Record<string, { total: number; unread: number }> = {};
      data?.forEach(msg => {
        if (!counts[msg.conversation_id]) {
          counts[msg.conversation_id] = { total: 0, unread: 0 };
        }
        counts[msg.conversation_id].total++;
        if (msg.direction === 'inbound') {
          counts[msg.conversation_id].unread++;
        }
      });
      
      return counts;
    },
    enabled: !!conversations,
  });

  const filteredConversations = conversations?.filter(conversation => {
    if (!searchTerm) return true;
    
    const contact = conversation.whatsapp_contacts;
    const searchLower = searchTerm.toLowerCase();
    
    return (
      contact?.phone_number?.includes(searchLower) ||
      contact?.display_name?.toLowerCase().includes(searchLower) ||
      contact?.first_name?.toLowerCase().includes(searchLower) ||
      contact?.last_name?.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Conversaties
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Conversaties ({filteredConversations?.length || 0})
        </CardTitle>
        
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Zoek conversaties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              Alle
            </Button>
            <Button
              variant={statusFilter === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('active')}
            >
              Actief
            </Button>
            <Button
              variant={statusFilter === 'archived' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('archived')}
            >
              Gearchiveerd
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto">
        <div className="space-y-2">
          {filteredConversations?.map((conversation) => {
            const contact = conversation.whatsapp_contacts;
            const messageCount = messageCounts?.[conversation.id];
            const isSelected = selectedConversationId === conversation.id;
            
            return (
              <div
                key={conversation.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  isSelected 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-white hover:bg-gray-50 border-gray-200'
                }`}
                onClick={() => onConversationSelect(conversation.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {contact?.display_name?.[0] || contact?.first_name?.[0] || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {contact?.display_name || 
                           `${contact?.first_name || ''} ${contact?.last_name || ''}`.trim() || 
                           contact?.phone_number}
                        </p>
                        <p className="text-xs text-gray-500">
                          {contact?.phone_number}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {conversation.last_message_at ? 
                          formatDistanceToNow(new Date(conversation.last_message_at), { 
                            addSuffix: true, 
                            locale: nl 
                          }) : 
                          'Nog geen berichten'
                        }
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={conversation.status === 'active' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {conversation.status}
                        </Badge>
                        {messageCount?.unread > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {messageCount.unread}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {filteredConversations?.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Geen conversaties gevonden</p>
              {searchTerm && (
                <p className="text-sm mt-1">Probeer een andere zoekterm</p>
              )}
              {!searchTerm && conversations?.length === 0 && (
                <p className="text-sm mt-1">Start uw eerste WhatsApp gesprek om te beginnen</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
