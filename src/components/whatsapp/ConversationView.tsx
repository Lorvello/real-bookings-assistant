
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, User, Send, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface ConversationViewProps {
  conversationId: string | null;
}

export function ConversationView({ conversationId }: ConversationViewProps) {
  const { data: messages, isLoading } = useWhatsAppMessages(conversationId || '');
  const [newMessage, setNewMessage] = React.useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!conversationId) {
    return (
      <Card className="bg-gray-800/90 border-gray-700 shadow-xl h-full flex flex-col">
        <CardHeader className="border-b border-gray-700 bg-gray-800/50">
          <CardTitle className="flex items-center gap-2 text-white">
            <MessageSquare className="w-5 h-5 text-green-400" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No conversation selected</h3>
            <p className="text-gray-400">Select a conversation from the list to view messages</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-gray-800/90 border-gray-700 shadow-xl h-full flex flex-col">
        <CardHeader className="border-b border-gray-700 bg-gray-800/50">
          <CardTitle className="flex items-center gap-2 text-white">
            <MessageSquare className="w-5 h-5 text-green-400" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-4">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-700/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="secondary" className="text-xs bg-gray-600/20 text-gray-300 border-gray-600/30">Sent</Badge>;
      case 'delivered':
        return <Badge className="text-xs bg-blue-500/20 text-blue-300 border-blue-500/30">Delivered</Badge>;
      case 'read':
        return <Badge className="text-xs bg-green-500/20 text-green-300 border-green-500/30">Read</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-xs bg-red-500/20 text-red-300 border-red-500/30">Failed</Badge>;
      default:
        return null;
    }
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // TODO: Implement message sending
      console.log('Sending message:', newMessage);
      setNewMessage('');
    }
  };

  return (
    <Card className="bg-gray-800/90 border-gray-700 shadow-xl h-full flex flex-col">
      <CardHeader className="border-b border-gray-700 bg-gray-800/50">
        <CardTitle className="flex items-center gap-2 text-white">
          <MessageSquare className="w-5 h-5 text-green-400" />
          Messages ({messages?.length || 0})
        </CardTitle>
      </CardHeader>
      
      {/* Messages Area */}
      <CardContent className="flex-1 overflow-y-auto p-4 bg-gray-850/50" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        {!messages || messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No messages yet</h3>
            <p className="text-gray-400 text-center">
              This conversation doesn't have any messages yet. Start a conversation by sending a message.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl relative shadow-sm ${
                    message.direction === 'outbound'
                      ? 'bg-green-600 text-white rounded-br-md'
                      : 'bg-gray-700 text-white rounded-bl-md border border-gray-600'
                  }`}
                >
                  {/* Message content */}
                  {message.content && (
                    <p className="text-sm mb-2 leading-relaxed">{message.content}</p>
                  )}
                  
                  {/* Timestamp and status */}
                  <div className={`flex items-center justify-between gap-2 text-xs ${
                    message.direction === 'outbound' ? 'text-green-100' : 'text-gray-400'
                  }`}>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        {format(new Date(message.created_at), 'HH:mm', { locale: nl })}
                      </span>
                    </div>
                    {message.status && getStatusBadge(message.status)}
                  </div>
                  
                  {/* Message tail */}
                  <div
                    className={`absolute bottom-0 w-3 h-3 ${
                      message.direction === 'outbound'
                        ? 'right-0 bg-green-600 transform rotate-45 translate-x-1 translate-y-1'
                        : 'left-0 bg-gray-700 transform rotate-45 -translate-x-1 translate-y-1 border-l border-b border-gray-600'
                    }`}
                  ></div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </CardContent>

      {/* Message Input */}
      <div className="border-t border-gray-700 p-4 bg-gray-800/50">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="flex-1 border-gray-600 bg-gray-700/50 text-white placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500/20"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="bg-green-600 hover:bg-green-700 text-white px-4"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
