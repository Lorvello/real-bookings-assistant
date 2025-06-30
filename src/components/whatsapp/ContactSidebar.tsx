
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Calendar, Clock } from 'lucide-react';
import { useWhatsAppConversations } from '@/hooks/useWhatsAppConversations';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface ContactSidebarProps {
  conversationId: string | null;
}

export function ContactSidebar({ conversationId }: ContactSidebarProps) {
  const { data: conversations } = useWhatsAppConversations(''); // We'll get the conversation from the list
  
  const conversation = conversations?.find(c => c.id === conversationId);
  const contact = conversation?.whatsapp_contacts;

  if (!conversationId || !conversation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Contact Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Selecteer een gesprek om contact informatie te bekijken</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayName = contact?.display_name || 
    `${contact?.first_name || ''} ${contact?.last_name || ''}`.trim() || 
    'Onbekend contact';

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
          <User className="w-5 h-5" />
          Contact Info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contact Details */}
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="font-medium text-lg">{displayName}</h3>
          {contact?.phone_number && (
            <div className="flex items-center justify-center gap-1 text-gray-500 mt-1">
              <Phone className="w-4 h-4" />
              <span>{contact.phone_number}</span>
            </div>
          )}
        </div>

        {/* Conversation Status */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">Gesprek Status</h4>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Status:</span>
            {getStatusBadge(conversation.status)}
          </div>
          
          {conversation.created_at && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-gray-500">Gestart:</span>
              <span className="text-sm">
                {format(new Date(conversation.created_at), 'dd MMM yyyy', { locale: nl })}
              </span>
            </div>
          )}
          
          {conversation.last_message_at && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-gray-500">Laatste bericht:</span>
              <span className="text-sm">
                {format(new Date(conversation.last_message_at), 'dd MMM HH:mm', { locale: nl })}
              </span>
            </div>
          )}
        </div>

        {/* Contact History */}
        {contact?.created_at && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Contact Geschiedenis</h4>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>
                Contact sinds {format(new Date(contact.created_at), 'dd MMM yyyy', { locale: nl })}
              </span>
            </div>
          </div>
        )}

        {/* Placeholder for Future Features */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">Acties</h4>
          <div className="text-sm text-gray-500">
            <p>• Bekijk volledige geschiedenis</p>
            <p>• Exporteer gesprek</p>
            <p>• Blokkeer contact</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
