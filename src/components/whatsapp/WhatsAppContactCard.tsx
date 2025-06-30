
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
          <Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Actief
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="secondary" className="bg-gray-50 text-gray-600 border-gray-200">
            <Archive className="w-3 h-3 mr-1" />
            Gesloten
          </Badge>
        );
      case 'archived':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
            <Archive className="w-3 h-3 mr-1" />
            Gearchiveerd
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
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
          <Badge className="bg-blue-50 text-blue-700 border-blue-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Bevestigd
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            In afwachting
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Geannuleerd
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
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
    <Card className="bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Modern Avatar */}
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-sm">
              {contact.profile_picture_url ? (
                <img 
                  src={contact.profile_picture_url} 
                  alt={displayName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                getInitials(displayName)
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              {/* Header with name and status */}
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-semibold text-gray-900 truncate text-base">
                  {displayName}
                </h3>
                {contact.conversation_status && getStatusBadge(contact.conversation_status)}
              </div>
              
              {/* Contact info */}
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="font-mono">{contact.phone_number}</span>
                </div>
                
                {contact.last_message_at && (
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-gray-400" />
                    <span>
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
            className="ml-3 h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
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
          <div className="mt-5 pt-5 border-t border-gray-100 space-y-5">
            {/* Contact Details */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                Contact Informatie
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 block mb-1">Telefoon:</span>
                  <div className="font-medium text-gray-900 font-mono">{contact.phone_number}</div>
                </div>
                {contact.contact_created_at && (
                  <div>
                    <span className="text-gray-500 block mb-1">Aangemaakt:</span>
                    <div className="font-medium text-gray-900">
                      {format(new Date(contact.contact_created_at), 'dd MMM yyyy', { locale: nl })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Latest Booking */}
            {contact.laatste_booking && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Laatste Afspraak
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-900">
                        {format(new Date(contact.laatste_booking), 'dd MMM yyyy HH:mm', { locale: nl })}
                      </span>
                    </div>
                    {contact.booking_status && getBookingStatusBadge(contact.booking_status)}
                  </div>
                  {contact.laatste_service && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Service:</span> {contact.laatste_service}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Conversation Timeline */}
            {contact.conversation_created_at && (
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-purple-600" />
                  Gesprek Status
                </h4>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">
                      Gestart: {format(new Date(contact.conversation_created_at), 'dd MMM yyyy', { locale: nl })}
                    </span>
                  </div>
                  {contact.conversation_status && getStatusBadge(contact.conversation_status)}
                </div>
              </div>
            )}

            {/* Business Context */}
            {(contact.calendar_name || contact.business_name) && (
              <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Bedrijfscontext
                </h4>
                <div className="space-y-2 text-sm">
                  {contact.business_name && (
                    <div>
                      <span className="text-gray-500">Bedrijf:</span>{' '}
                      <span className="font-medium text-gray-900">{contact.business_name}</span>
                    </div>
                  )}
                  {contact.calendar_name && (
                    <div>
                      <span className="text-gray-500">Kalender:</span>{' '}
                      <span className="font-medium text-gray-900">{contact.calendar_name}</span>
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
