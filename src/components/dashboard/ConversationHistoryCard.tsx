
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Phone, Clock, User } from 'lucide-react';
import { useConversations } from '@/hooks/useConversations';
import { useAuth } from '@/hooks/useAuth';

export const ConversationHistoryCard = () => {
  const { user } = useAuth();
  const { conversations, loading } = useConversations(user);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'resolved':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return date.toLocaleDateString('nl-NL');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-green-600" />
            Recent Conversations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Loading conversations...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-green-600" />
          Recent Conversations
          <Badge variant="outline" className="ml-auto">
            {conversations.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {conversations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No conversations yet</p>
            <p className="text-sm">Your WhatsApp conversations will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {conversations.slice(0, 5).map((conversation) => (
              <div
                key={conversation.id}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">
                      {conversation.client_name || 'Anonymous User'}
                    </span>
                  </div>
                  <Badge className={getStatusColor(conversation.status)} variant="outline">
                    {conversation.status}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>{conversation.client_phone}</span>
                  </div>

                  {conversation.last_message && (
                    <div className="text-sm text-gray-700 line-clamp-2">
                      "{conversation.last_message}"
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-gray-100">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(conversation.last_message_at)}</span>
                  </div>
                </div>
              </div>
            ))}
            
            {conversations.length > 5 && (
              <div className="text-center pt-4">
                <button className="text-sm text-green-600 hover:text-green-500 font-medium">
                  View all conversations →
                </button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
