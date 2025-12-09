
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, User, Clock, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredConversations = conversations?.filter(conversation => {
    const contact = conversation.whatsapp_contacts;
    const displayName = contact?.display_name || 
      `${contact?.first_name || ''} ${contact?.last_name || ''}`.trim() || 
      'Unknown contact';
    
    return displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           contact?.phone_number?.includes(searchTerm);
  }) || [];

  if (isLoading) {
    return (
      <Card className="bg-gray-800/90 border-gray-700 shadow-xl h-full">
        <CardHeader className="border-b border-gray-700 bg-gray-800/50">
          <CardTitle className="flex items-center gap-2 text-white">
            <MessageSquare className="w-5 h-5 text-green-400" />
            Conversations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-700/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30">
            Active
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="secondary" className="bg-gray-600/20 text-gray-300 border-gray-600/30">
            Closed
          </Badge>
        );
      case 'archived':
        return (
          <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
            Archived
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-600/20 text-gray-400 border-gray-600/30">
            Unknown
          </Badge>
        );
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Card className="bg-gray-800/90 border-gray-700 shadow-xl h-full flex flex-col">
      <CardHeader className="border-b border-gray-700 bg-gray-800/50 pb-4">
        <CardTitle className="flex items-center gap-2 text-white mb-4">
          <MessageSquare className="w-5 h-5 text-green-400" />
          Conversations ({filteredConversations.length})
        </CardTitle>
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
          <Input
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-gray-600 bg-gray-700/50 text-white placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500/20"
          />
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-0">
        {!conversations || conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 px-4">
            <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No conversations</h3>
            <p className="text-gray-400 text-center">
              No WhatsApp conversations found for this calendar yet.
            </p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 px-4">
            <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No results</h3>
            <p className="text-gray-400 text-center">
              No conversations found for "{searchTerm}"
            </p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredConversations.map((conversation) => {
              const contact = conversation.whatsapp_contacts;
              const displayName = contact?.display_name || 
                `${contact?.first_name || ''} ${contact?.last_name || ''}`.trim() || 
                'Unknown contact';
              
              const isSelected = selectedConversationId === conversation.id;

              return (
                <div
                  key={conversation.id}
                  onClick={() => onConversationSelect(conversation.id)}
                  className={`p-4 rounded-lg cursor-pointer transition-all duration-200 border ${
                    isSelected 
                      ? 'bg-green-500/20 border-green-500/30 shadow-lg' 
                      : 'hover:bg-gray-700/50 border-transparent hover:border-gray-600/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-sm flex-shrink-0">
                      {getInitials(displayName)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-white truncate">{displayName}</h4>
                        {getStatusBadge(conversation.status)}
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span className="font-mono truncate">{contact?.phone_number}</span>
                      </div>
                      
                      {conversation.created_at && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {format(new Date(conversation.created_at), 'dd MMM HH:mm', { locale: nl })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
