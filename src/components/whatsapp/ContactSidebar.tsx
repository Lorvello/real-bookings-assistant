
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Calendar, Clock, MessageSquare, Mail } from 'lucide-react';
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
      <Card className="bg-gray-800/90 border-gray-700 shadow-xl h-full">
        <CardHeader className="border-b border-gray-700 bg-gray-800/50">
          <CardTitle className="flex items-center gap-2 text-white">
            <User className="w-5 h-5 text-green-400" />
            Contact Info
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Geen contact geselecteerd</h3>
            <p className="text-gray-400 text-center">
              Selecteer een gesprek om contact informatie te bekijken
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayName = contact?.display_name || 
    `${contact?.first_name || ''} ${contact?.last_name || ''}`.trim() || 
    'Onbekend contact';

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
            Actief
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="secondary" className="bg-gray-600/20 text-gray-300 border-gray-600/30">
            Gesloten
          </Badge>
        );
      case 'archived':
        return (
          <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
            Gearchiveerd
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-600/20 text-gray-400 border-gray-600/30">
            Onbekend
          </Badge>
        );
    }
  };

  return (
    <Card className="bg-gray-800/90 border-gray-700 shadow-xl h-full">
      <CardHeader className="border-b border-gray-700 bg-gray-800/50">
        <CardTitle className="flex items-center gap-2 text-white">
          <User className="w-5 h-5 text-green-400" />
          Contact Info
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Contact Avatar & Name */}
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-medium text-lg shadow-lg">
            {getInitials(displayName)}
          </div>
          <h3 className="font-semibold text-xl text-white mb-2">{displayName}</h3>
          {contact?.phone_number && (
            <div className="flex items-center justify-center gap-2 text-gray-400">
              <Phone className="w-4 h-4" />
              <span className="font-mono">{contact.phone_number}</span>
            </div>
          )}
        </div>

        {/* Conversation Status */}
        <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-700/50">
          <h4 className="font-medium text-white mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-green-400" />
            Gesprek Status
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Status:</span>
              {getStatusBadge(conversation.status)}
            </div>
            
            {conversation.created_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Gestart:</span>
                <span className="text-sm text-gray-200">
                  {format(new Date(conversation.created_at), 'dd MMM yyyy', { locale: nl })}
                </span>
              </div>
            )}
            
            {conversation.last_message_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Laatste bericht:</span>
                <span className="text-sm text-gray-200">
                  {format(new Date(conversation.last_message_at), 'dd MMM HH:mm', { locale: nl })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Contact Details */}
        <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30">
          <h4 className="font-medium text-white mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-400" />
            Contact Details
          </h4>
          
          <div className="space-y-2 text-sm">
            {contact?.first_name && (
              <div className="flex justify-between">
                <span className="text-gray-400">Voornaam:</span>
                <span className="text-gray-200">{contact.first_name}</span>
              </div>
            )}
            
            {contact?.last_name && (
              <div className="flex justify-between">
                <span className="text-gray-400">Achternaam:</span>
                <span className="text-gray-200">{contact.last_name}</span>
              </div>
            )}
            
            {/* Check if contact has linked_customer_email property */}
            {contact && 'linked_customer_email' in contact && contact.linked_customer_email && (
              <div className="flex justify-between">
                <span className="text-gray-400">Email:</span>
                <span className="text-gray-200 font-mono text-xs">{contact.linked_customer_email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Contact History */}
        {contact?.created_at && (
          <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/30">
            <h4 className="font-medium text-white mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              Contact Geschiedenis
            </h4>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-300">
                Contact sinds {format(new Date(contact.created_at), 'dd MMM yyyy', { locale: nl })}
              </span>
            </div>
            
            {/* Check if contact has last_seen_at property */}
            {contact && 'last_seen_at' in contact && contact.last_seen_at && (
              <div className="flex items-center gap-2 text-sm mt-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">
                  Laatst gezien: {format(new Date(contact.last_seen_at), 'dd MMM yyyy HH:mm', { locale: nl })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/30">
          <h4 className="font-medium text-white mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            Snelle Acties
          </h4>
          <div className="space-y-2 text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
              <span>Nieuwe afspraak maken</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>Gesprek archiveren</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <span>Contact blokkeren</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
