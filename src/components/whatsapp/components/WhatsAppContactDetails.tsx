
import React from 'react';
import { 
  User,
  Clock,
  Calendar,
  MessageCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { getStatusBadge, getBookingStatusBadge } from '../utils/badgeUtils';
import type { WhatsAppContactOverview, BookingInfo } from '@/types/whatsappOverview';

interface WhatsAppContactDetailsProps {
  contact: WhatsAppContactOverview;
}

export function WhatsAppContactDetails({ contact }: WhatsAppContactDetailsProps) {
  const bookings = contact.all_bookings || [];
  
  return (
    <div className="mt-5 pt-5 border-t border-white/[0.08] space-y-5">
      {/* Contact Details */}
      <div className="bg-muted/30 rounded-lg p-4 border border-white/[0.08]">
        <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          Contact information
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground block mb-1">Phone:</span>
            <div className="font-medium text-foreground font-mono tabular-nums">{contact.phone_number}</div>
          </div>
          {contact.contact_created_at && (
            <div>
              <span className="text-muted-foreground block mb-1">Created:</span>
              <div className="font-medium text-foreground tabular-nums">
                {format(new Date(contact.contact_created_at), 'd MMM yyyy', { locale: nl })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* All bookings */}
      <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
        <h4 className="font-medium text-foreground mb-3 flex items-center gap-2 tabular-nums">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          Bookings ({bookings.length})
        </h4>

        {bookings.length > 0 ? (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {bookings.map((booking: BookingInfo) => (
              <div
                key={booking.booking_id}
                className="bg-muted rounded-lg p-3 border border-white/[0.08]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-foreground tabular-nums">
                      {format(new Date(booking.start_time), 'd MMM yyyy HH:mm', { locale: nl })}
                    </span>
                  </div>
                  {booking.status && getBookingStatusBadge(booking.status)}
                </div>

                <div className="space-y-1 text-sm">
                  {booking.service_name && (
                    <div className="text-foreground">
                      <span className="text-muted-foreground">Service:</span> {booking.service_name}
                    </div>
                  )}
                  {booking.calendar_name && (
                    <div className="text-foreground">
                      <span className="text-muted-foreground">Calendar:</span> {booking.calendar_name}
                    </div>
                  )}
                  {booking.business_name && (
                    <div className="text-foreground">
                      <span className="text-muted-foreground">Business:</span> {booking.business_name}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No bookings found</p>
        )}
      </div>

      {/* Conversation Timeline */}
      {contact.conversation_created_at && (
        <div className="bg-gold/10 rounded-lg p-4 border border-gold/20">
          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
            Conversation Status
          </h4>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground tabular-nums">
                Started: {format(new Date(contact.conversation_created_at), 'd MMM yyyy', { locale: nl })}
              </span>
            </div>
            {contact.conversation_status && getStatusBadge(contact.conversation_status)}
          </div>
        </div>
      )}
    </div>
  );
}
