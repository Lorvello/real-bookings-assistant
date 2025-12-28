
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
                {format(new Date(contact.contact_created_at), 'd MMM yyyy', { locale: nl })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Alle Boekingen */}
      <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30">
        <h4 className="font-medium text-white mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-400" />
          Boekingen ({bookings.length})
        </h4>
        
        {bookings.length > 0 ? (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {bookings.map((booking: BookingInfo) => (
              <div 
                key={booking.booking_id} 
                className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-200">
                      {format(new Date(booking.start_time), 'd MMM yyyy HH:mm', { locale: nl })}
                    </span>
                  </div>
                  {booking.status && getBookingStatusBadge(booking.status)}
                </div>
                
                <div className="space-y-1 text-sm">
                  {booking.service_name && (
                    <div className="text-gray-300">
                      <span className="text-gray-500">Service:</span> {booking.service_name}
                    </div>
                  )}
                  {booking.calendar_name && (
                    <div className="text-gray-300">
                      <span className="text-gray-500">Kalender:</span> {booking.calendar_name}
                    </div>
                  )}
                  {booking.business_name && (
                    <div className="text-gray-300">
                      <span className="text-gray-500">Bedrijf:</span> {booking.business_name}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Geen boekingen gevonden</p>
        )}
      </div>

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
                Gestart: {format(new Date(contact.conversation_created_at), 'd MMM yyyy', { locale: nl })}
              </span>
            </div>
            {contact.conversation_status && getStatusBadge(contact.conversation_status)}
          </div>
        </div>
      )}
    </div>
  );
}
