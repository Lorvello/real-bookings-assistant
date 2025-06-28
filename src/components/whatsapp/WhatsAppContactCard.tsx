
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, User, ChevronDown, ChevronUp } from 'lucide-react';
import { WhatsAppContactDetails } from './WhatsAppContactDetails';
import { formatPhone, getStatusColor } from './utils/contactFormatters';
import type { WhatsAppContactOverview as WhatsAppContact } from '@/types/whatsappOverview';

interface WhatsAppContactCardProps {
  contact: WhatsAppContact;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

export function WhatsAppContactCard({ contact, isExpanded, onToggleExpanded }: WhatsAppContactCardProps) {
  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-medium">
              {contact.display_name || 
               `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 
               'Onbekende naam'}
            </h3>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Phone className="w-3 h-3" />
              {formatPhone(contact.phone_number)}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {contact.conversation_status && (
            <Badge className={getStatusColor(contact.conversation_status)}>
              {contact.conversation_status}
            </Badge>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpanded}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {isExpanded && <WhatsAppContactDetails contact={contact} />}
    </div>
  );
}
