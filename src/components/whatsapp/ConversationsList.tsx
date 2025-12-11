import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, User, Clock, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useWhatsAppConversations } from '@/hooks/useWhatsAppConversations';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
    const contact = conversation.whatsapp_contact_overview;
    const displayName = contact?.display_name || 
      `${contact?.first_name || ''} ${contact?.last_name || ''}`.trim() || 
      'Unknown contact';
    
    return displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           contact?.phone_number?.includes(searchTerm);
  }) || [];

  if (isLoading) {
    return (
      <Card className="backdrop-blur-sm bg-card/80 border-border/50 shadow-xl shadow-black/10 h-full">
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-card to-primary/5">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            Conversations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted/50 rounded-xl animate-pulse" />
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
          <Badge className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border-green-500/30 shadow-sm shadow-green-500/10">
            Active
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="secondary" className="bg-muted/50 text-muted-foreground border-border/50">
            Closed
          </Badge>
        );
      case 'archived':
        return (
          <Badge variant="outline" className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30 shadow-sm shadow-blue-500/10">
            Archived
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border/50">
            Unknown
          </Badge>
        );
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Card className="backdrop-blur-sm bg-card/80 border-border/50 shadow-xl shadow-black/10 h-full flex flex-col">
      <CardHeader className="border-b border-border/50 bg-gradient-to-r from-card to-primary/5 pb-4">
        <CardTitle className="flex items-center gap-2 text-foreground mb-4">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          Conversations ({filteredConversations.length})
        </CardTitle>
        
        {/* Premium Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-border/50 bg-muted/50 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 transition-all"
          />
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-0">
        {!conversations || conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 px-4">
            <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4 ring-2 ring-border/50">
              <MessageSquare className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No conversations</h3>
            <p className="text-muted-foreground text-center">
              No WhatsApp conversations found for this calendar yet.
            </p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 px-4">
            <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4 ring-2 ring-border/50">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No results</h3>
            <p className="text-muted-foreground text-center">
              No conversations found for "{searchTerm}"
            </p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredConversations.map((conversation) => {
              const contact = conversation.whatsapp_contact_overview;
              const displayName = contact?.display_name || 
                `${contact?.first_name || ''} ${contact?.last_name || ''}`.trim() || 
                'Unknown contact';
              
              const isSelected = selectedConversationId === conversation.id;

              return (
                <div
                  key={conversation.id}
                  onClick={() => onConversationSelect(conversation.id)}
                  className={cn(
                    "p-4 rounded-xl cursor-pointer transition-all duration-200 border group",
                    isSelected 
                      ? 'bg-primary/15 border-primary/30 shadow-lg shadow-primary/10' 
                      : 'bg-card/50 border-border/50 hover:bg-muted/70 hover:border-primary/20 hover:shadow-md'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Premium Avatar with glow */}
                    <div className={cn(
                      "w-12 h-12 bg-gradient-to-br from-primary to-emerald-500 rounded-full flex items-center justify-center text-primary-foreground font-medium text-sm flex-shrink-0 transition-all ring-2 ring-offset-2 ring-offset-background",
                      isSelected ? "ring-primary shadow-lg shadow-primary/25" : "ring-transparent group-hover:ring-primary/30"
                    )}>
                      {getInitials(displayName)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-foreground truncate">{displayName}</h4>
                        {getStatusBadge(conversation.status)}
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-mono truncate">{contact?.phone_number}</span>
                      </div>
                      
                      {conversation.created_at && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground/70 mt-1">
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
