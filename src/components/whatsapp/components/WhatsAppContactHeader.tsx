
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Phone, 
  MessageCircle, 
  ChevronDown, 
  ChevronUp,
  Building2,
  Pencil
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { getStatusBadge } from '../utils/badgeUtils';
import type { WhatsAppContactOverview } from '@/types/whatsappOverview';
import { BusinessOverrideDialog } from './BusinessOverrideDialog';

interface WhatsAppContactHeaderProps {
  contact: WhatsAppContactOverview;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

export function WhatsAppContactHeader({
  contact,
  isExpanded,
  onToggleExpanded,
}: WhatsAppContactHeaderProps) {
  const [showBusinessDialog, setShowBusinessDialog] = useState(false);
  
  const displayName = contact.display_name || 
    `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 
    'Onbekend contact';

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
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
            <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-gray-500" />
                <span className="font-mono text-gray-300">{contact.phone_number}</span>
              </div>
              
              {/* Business name - persistent via override, clickable to edit */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBusinessDialog(true);
                }}
                className="flex items-center gap-1.5 hover:bg-gray-700/50 rounded px-1.5 py-0.5 -mx-1.5 transition-colors group"
              >
                <Building2 className="w-4 h-4 text-emerald-500" />
                {contact.with_business ? (
                  <span className="text-emerald-400 font-medium">{contact.with_business}</span>
                ) : (
                  <span className="text-gray-500 italic">Geen business</span>
                )}
                <Pencil className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              
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

      <BusinessOverrideDialog
        open={showBusinessDialog}
        onOpenChange={setShowBusinessDialog}
        contactId={contact.contact_id}
        currentBusiness={contact.with_business}
      />
    </>
  );
}
