
import React from 'react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Calendar, Clock } from 'lucide-react';
import { formatDate, getBookingStatusColor } from './utils/contactFormatters';
import type { WhatsAppContactOverview as WhatsAppContact, BookingInfo } from '@/types/whatsappOverview';

interface WhatsAppContactDetailsProps {
  contact: WhatsAppContact;
}

export function WhatsAppContactDetails({ contact }: WhatsAppContactDetailsProps) {
  const bookings = contact.all_bookings || [];
  const latestBooking = bookings[0]; // Gesorteerd op datum, nieuwste eerst

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
            Boekingen ({bookings.length})
          </h4>
          {bookings.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {bookings.slice(0, 3).map((booking: BookingInfo) => (
                <div key={booking.booking_id} className="text-gray-600 p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {formatDate(booking.start_time)}
                  </div>
                  <p className="font-medium">{booking.service_name || 'Onbekend'}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">{booking.calendar_name}</span>
                    {booking.status && (
                      <Badge className={getBookingStatusColor(booking.status)} variant="secondary">
                        {booking.status}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {bookings.length > 3 && (
                <p className="text-xs text-gray-500">+{bookings.length - 3} meer boekingen</p>
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
