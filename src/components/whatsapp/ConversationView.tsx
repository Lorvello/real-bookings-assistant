
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, User } from 'lucide-react';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface ConversationViewProps {
  conversationId: string | null;
}

export function ConversationView({ conversationId }: ConversationViewProps) {
  const { data: messages, isLoading } = useWhatsAppMessages(conversationId || '');

  if (!conversationId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Berichten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Selecteer een gesprek om berichten te bekijken</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Berichten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="secondary" className="text-xs">Verzonden</Badge>;
      case 'delivered':
        return <Badge variant="default" className="bg-blue-100 text-blue-800 text-xs">Afgeleverd</Badge>;
      case 'read':
        return <Badge variant="default" className="bg-green-100 text-green-800 text-xs">Gelezen</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-xs">Mislukt</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Berichten ({messages?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-96 overflow-y-auto">
        {!messages || messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nog geen berichten in dit gesprek</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                    message.direction === 'outbound'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                      <User className="w-2 h-2" />
                    </div>
                    <span className="text-xs opacity-75">
                      {message.direction === 'outbound' ? 'Bot' : 'Klant'}
                    </span>
                  </div>
                  
                  {message.content && (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                  
                  <div className="flex items-center justify-between mt-2 text-xs opacity-75">
                    <span>
                      {format(new Date(message.created_at), 'HH:mm', { locale: nl })}
                    </span>
                    {message.status && getStatusBadge(message.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
