
import React from 'react';
import { 
  User,
  Clock,
  CheckCircle,
  Calendar,
  MessageCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { getStatusBadge, getBookingStatusBadge } from '../utils/badgeUtils';
import type { WhatsAppContactOverview } from '@/types/whatsappOverview';

interface WhatsAppContactDetailsProps {
  contact: WhatsAppContactOverview;
}

export function WhatsAppContactDetails({ contact }: WhatsAppContactDetailsProps) {
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
  );
}
