
import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, MessageSquare, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useSendWhatsAppMessage } from '@/hooks/useWhatsAppMessages';

interface ConversationViewProps {
  conversationId?: string;
}

export function ConversationView({ conversationId }: ConversationViewProps) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendMessage = useSendWhatsAppMessage();

  const { data: messages, isLoading } = useQuery({
    queryKey: ['whatsapp-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });

  const { data: conversation } = useQuery({
    queryKey: ['whatsapp-conversation', conversationId],
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
            last_name
          )
        `)
        .eq('id', conversationId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId) return;

    try {
      await sendMessage.mutateAsync({
        conversation_id: conversationId,
        message_type: 'text',
        content: newMessage.trim(),
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!conversationId) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Select a conversation to view messages</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const contact = conversation?.whatsapp_contacts;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="font-medium text-blue-600">
                {contact?.display_name?.[0] || contact?.first_name?.[0] || '?'}
              </span>
            </div>
            <div>
              <h3 className="font-medium">
                {contact?.display_name || 
                 `${contact?.first_name || ''} ${contact?.last_name || ''}`.trim() || 
                 contact?.phone_number}
              </h3>
              <p className="text-sm text-gray-500">{contact?.phone_number}</p>
            </div>
          </div>
          
          <Badge 
            variant={conversation?.status === 'active' ? 'default' : 'secondary'}
          >
            {conversation?.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className={`h-12 bg-gray-200 rounded-lg w-3/4 ${i % 2 === 0 ? 'ml-auto' : ''}`}></div>
                </div>
              ))}
            </div>
          ) : messages?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No messages in this conversation yet</p>
            </div>
          ) : (
            messages?.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.direction === 'outbound'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span
                      className={`text-xs ${
                        message.direction === 'outbound'
                          ? 'text-blue-100'
                          : 'text-gray-500'
                      }`}
                    >
                      {formatDistanceToNow(new Date(message.created_at), {
                        addSuffix: true,
                        locale: nl,
                      })}
                    </span>
                    {message.direction === 'outbound' && (
                      <Badge
                        variant={message.status === 'delivered' ? 'default' : 'secondary'}
                        className="text-xs ml-2"
                      >
                        {message.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Message input */}
        <div className="border-t p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
              disabled={sendMessage.isPending}
            />
            <Button
              type="submit"
              disabled={!newMessage.trim() || sendMessage.isPending}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
