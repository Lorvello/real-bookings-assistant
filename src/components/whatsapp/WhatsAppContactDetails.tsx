
import React from 'react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Calendar } from 'lucide-react';
import { formatDate, getBookingStatusColor } from './utils/contactFormatters';
import type { WhatsAppContactOverview as WhatsAppContact } from '@/types/whatsappOverview';

interface WhatsAppContactDetailsProps {
  contact: WhatsAppContact;
}

export function WhatsAppContactDetails({ contact }: WhatsAppContactDetailsProps) {
  return (
    <>
      <Separator className="my-3" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <h4 className="font-medium mb-2 flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            Gesprek informatie
          </h4>
          <div className="space-y-1 text-gray-600">
            <p>Laatste bericht: {formatDate(contact.last_message_at)}</p>
            <p>Gesprek gestart: {formatDate(contact.conversation_created_at)}</p>
            <p>Laatst gezien: {formatDate(contact.last_seen_at)}</p>
            <p>Contact aangemaakt: {formatDate(contact.contact_created_at)}</p>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium mb-2 flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            Laatste booking
          </h4>
          {contact.laatste_booking ? (
            <div className="space-y-1 text-gray-600">
              <p>Service: {contact.laatste_service || 'Onbekend'}</p>
              <p>Datum: {formatDate(contact.laatste_booking)}</p>
              {contact.booking_status && (
                <Badge className={getBookingStatusColor(contact.booking_status)}>
                  {contact.booking_status}
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-gray-500">Geen boekingen gevonden</p>
          )}
        </div>
      </div>
    </>
  );
}
