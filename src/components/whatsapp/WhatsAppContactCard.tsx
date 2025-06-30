
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  MessageCircle, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Archive
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import type { WhatsAppContactOverview } from '@/types/whatsappOverview';

interface WhatsAppContactCardProps {
  contact: WhatsAppContactOverview;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

export function WhatsAppContactCard({
  contact,
  isExpanded,
  onToggleExpanded,
}: WhatsAppContactCardProps) {
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Actief
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="secondary" className="bg-gray-600/20 text-gray-300 border-gray-600/30">
            <Archive className="w-3 h-3 mr-1" />
            Gesloten
          </Badge>
        );
      case 'archived':
        return (
          <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
            <Archive className="w-3 h-3 mr-1" />
            Gearchiveerd
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-600/20 text-gray-400 border-gray-600/30">
            <AlertCircle className="w-3 h-3 mr-1" />
            Onbekend
          </Badge>
        );
    }
  };

  const getBookingStatusBadge = (status?: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Bevestigd
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
            <Clock className="w-3 h-3 mr-1" />
            In afwachting
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
            <AlertCircle className="w-3 h-3 mr-1" />
            Geannuleerd
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Voltooid
          </Badge>
        );
      default:
        return null;
    }
  };

  const displayName = contact.display_name || 
    `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 
    'Onbekend contact';

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700 hover:border-gray-600 hover:shadow-lg hover:bg-gray-800/70 transition-all duration-200">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Modern Avatar - gradient backgrounds */}
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-sm">
              {getInitials(displayName)}
            </div>
            
            <div className="flex-1 min-w-0">
              {/* Header with name and status */}
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-semibold text-white truncate text-base">
                  {displayName}
                </h3>
                {contact.conversation_status && getStatusBadge(contact.conversation_status)}
              </div>
              
              {/* Contact info */}
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span className="font-mono text-gray-300">{contact.phone_number}</span>
                </div>
                
                {contact.last_message_at && (
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-400">
                      {format(new Date(contact.last_message_at), 'dd MMM HH:mm', { locale: nl })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Expand button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpanded}
            className="ml-3 h-8 w-8 p-0 text-gray-400 hover:text-gray-200 hover:bg-gray-700"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="mt-5 pt-5 border-t border-gray-700 space-y-5">
            {/* Contact Details */}
            <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-700/50">
              <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                Contact Informatie
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-400 block mb-1">Telefoon:</span>
                  <div className="font-medium text-gray-200 font-mono">{contact.phone_number}</div>
                </div>
                {contact.contact_created_at && (
                  <div>
                    <span className="text-gray-400 block mb-1">Aangemaakt:</span>
                    <div className="font-medium text-gray-200">
                      {format(new Date(contact.contact_created_at), 'dd MMM yyyy', { locale: nl })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Latest Booking */}
            {contact.laatste_booking && (
              <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30">
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  Laatste Afspraak
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-200">
                        {format(new Date(contact.laatste_booking), 'dd MMM yyyy HH:mm', { locale: nl })}
                      </span>
                    </div>
                    {contact.booking_status && getBookingStatusBadge(contact.booking_status)}
                  </div>
                  {contact.laatste_service && (
                    <div className="text-sm text-gray-300">
                      <span className="font-medium">Service:</span> {contact.laatste_service}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Conversation Timeline */}
            {contact.conversation_created_at && (
              <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/30">
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-purple-400" />
                  Gesprek Status
                </h4>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">
                      Gestart: {format(new Date(contact.conversation_created_at), 'dd MMM yyyy', { locale: nl })}
                    </span>
                  </div>
                  {contact.conversation_status && getStatusBadge(contact.conversation_status)}
                </div>
              </div>
            )}

            {/* Business Context */}
            {(contact.calendar_name || contact.business_name) && (
              <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/30">
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Bedrijfscontext
                </h4>
                <div className="space-y-2 text-sm">
                  {contact.business_name && (
                    <div>
                      <span className="text-gray-400">Bedrijf:</span>{' '}
                      <span className="font-medium text-gray-200">{contact.business_name}</span>
                    </div>
                  )}
                  {contact.calendar_name && (
                    <div>
                      <span className="text-gray-400">Kalender:</span>{' '}
                      <span className="font-medium text-gray-200">{contact.calendar_name}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
