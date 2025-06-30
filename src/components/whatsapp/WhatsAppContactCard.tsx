
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
  Clock
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
        return <Badge variant="default" className="bg-green-100 text-green-800">Actief</Badge>;
      case 'closed':
        return <Badge variant="secondary">Gesloten</Badge>;
      case 'archived':
        return <Badge variant="outline">Gearchiveerd</Badge>;
      default:
        return <Badge variant="outline">Onbekend</Badge>;
    }
  };

  const getBookingStatusBadge = (status?: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Bevestigd</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">In afwachting</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Geannuleerd</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Voltooid</Badge>;
      default:
        return null;
    }
  };

  const displayName = contact.display_name || 
    `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 
    'Onbekend contact';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900 truncate">
                  {displayName}
                </h3>
                {contact.conversation_status && getStatusBadge(contact.conversation_status)}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                <Phone className="w-4 h-4" />
                <span>{contact.phone_number}</span>
                {contact.last_message_at && (
                  <>
                    <MessageCircle className="w-4 h-4 ml-2" />
                    <span>
                      {format(new Date(contact.last_message_at), 'dd MMM HH:mm', { locale: nl })}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpanded}
            className="ml-2"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-3">
            {/* Contact Details */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Contact Informatie</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Telefoon:</span>
                  <div className="font-medium">{contact.phone_number}</div>
                </div>
                {contact.contact_created_at && (
                  <div>
                    <span className="text-gray-500">Aangemaakt:</span>
                    <div className="font-medium">
                      {format(new Date(contact.contact_created_at), 'dd MMM yyyy', { locale: nl })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Latest Booking */}
            {contact.laatste_booking && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Laatste Afspraak</h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">
                        {format(new Date(contact.laatste_booking), 'dd MMM yyyy HH:mm', { locale: nl })}
                      </span>
                    </div>
                    {contact.booking_status && getBookingStatusBadge(contact.booking_status)}
                  </div>
                  {contact.laatste_service && (
                    <p className="text-sm text-gray-600">Service: {contact.laatste_service}</p>
                  )}
                </div>
              </div>
            )}

            {/* Conversation Status */}
            {contact.conversation_created_at && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Gesprek</h4>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span>Gestart: {format(new Date(contact.conversation_created_at), 'dd MMM yyyy', { locale: nl })}</span>
                  </div>
                  {contact.conversation_status && getStatusBadge(contact.conversation_status)}
                </div>
              </div>
            )}

            {/* Business Context */}
            {(contact.calendar_name || contact.business_name) && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Bedrijf</h4>
                <div className="text-sm">
                  {contact.business_name && (
                    <p><span className="text-gray-500">Bedrijf:</span> {contact.business_name}</p>
                  )}
                  {contact.calendar_name && (
                    <p><span className="text-gray-500">Kalender:</span> {contact.calendar_name}</p>
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
