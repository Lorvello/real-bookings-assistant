import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Calendar, Clock, MessageSquare, Mail, Link } from 'lucide-react';
import { useWhatsAppConversations } from '@/hooks/useWhatsAppConversations';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface ContactSidebarProps {
  conversationId: string | null;
}

export function ContactSidebar({ conversationId }: ContactSidebarProps) {
  const { data: conversations } = useWhatsAppConversations(''); // We'll get the conversation from the list
  
  const conversation = conversations?.find(c => c.id === conversationId);
  const contact = conversation?.whatsapp_contact_overview;

  if (!conversationId || !conversation) {
    return (
      <Card className="bg-card border-white/[0.08] h-full">
        <CardHeader className="border-b border-white/[0.08] bg-card">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <User className="w-5 h-5 text-muted-foreground" />
            Contact Info
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No contact selected</h3>
            <p className="text-muted-foreground text-center">
              Select a conversation to view contact information
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayName = contact?.display_name || 
    `${contact?.first_name || ''} ${contact?.last_name || ''}`.trim() || 
    'Unknown contact';

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-success/10 text-success-foreground ring-1 ring-success/20 border-transparent">
            Active
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="secondary" className="bg-muted text-muted-foreground ring-1 ring-white/[0.08] border-transparent">
            Closed
          </Badge>
        );
      case 'archived':
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground ring-1 ring-white/[0.08] border-transparent">
            Archived
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground ring-1 ring-white/[0.08] border-transparent">
            Unknown
          </Badge>
        );
    }
  };

  return (
    <Card className="bg-card border-white/[0.08] h-full">
      <CardHeader className="border-b border-white/[0.08] bg-card">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <User className="w-5 h-5 text-muted-foreground" />
          Contact Info
          {conversation.calendar_id && (
            <Badge className="bg-success/10 text-success-foreground ring-1 ring-success/20 border-transparent ml-auto">
              <Link className="w-3 h-3 mr-1" />
              Linked
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Contact Avatar & Name */}
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-success rounded-full flex items-center justify-center mx-auto mb-4 text-primary-foreground font-medium text-lg">
            {getInitials(displayName)}
          </div>
          <h3 className="font-semibold text-xl text-foreground mb-2">{displayName}</h3>
          {contact?.phone_number && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Phone className="w-4 h-4" />
              <span className="font-mono tabular-nums">{contact.phone_number}</span>
            </div>
          )}
        </div>

        {/* Conversation Status */}
        <div className="bg-muted/30 rounded-lg p-4 border border-white/[0.08]">
          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            Conversation Status
          </h4>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status:</span>
              {getStatusBadge(conversation.status)}
            </div>

            {conversation.created_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Started:</span>
                <span className="text-sm text-foreground tabular-nums">
                  {format(new Date(conversation.created_at), 'dd MMM yyyy', { locale: nl })}
                </span>
              </div>
            )}
            

            {conversation.calendar_id && (
              <div className="bg-success/10 border border-success/30 rounded-lg p-3 mt-3">
                <div className="flex items-center gap-2 text-sm text-success-foreground">
                  <Link className="w-4 h-4" />
                  <span className="font-medium">Automatically linked to calendar</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contact Details */}
        <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            Contact Details
          </h4>

          <div className="space-y-2 text-sm">
            {contact?.first_name && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">First name:</span>
                <span className="text-foreground">{contact.first_name}</span>
              </div>
            )}

            {contact?.last_name && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last name:</span>
                <span className="text-foreground">{contact.last_name}</span>
              </div>
            )}

            {/* Check if contact has linked_customer_email property */}
            {contact && 'linked_customer_email' in contact && contact.linked_customer_email && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="text-foreground font-mono text-xs">{String(contact.linked_customer_email)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Contact History */}
        {contact?.contact_created_at && (
          <div className="bg-gold/10 rounded-lg p-4 border border-gold/20">
            <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Contact History
            </h4>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground tabular-nums">
                Contact since {format(new Date(contact.contact_created_at), 'dd MMM yyyy', { locale: nl })}
              </span>
            </div>

            {contact.last_message_at && (
              <div className="flex items-center gap-2 text-sm mt-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground tabular-nums">
                  Last message: {format(new Date(contact.last_message_at), 'dd MMM yyyy HH:mm', { locale: nl })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            Quick Actions
          </h4>
          <div className="space-y-2 text-sm text-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Create new appointment</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Archive conversation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <span>Block contact</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
