
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { WhatsAppContactHeader } from './components/WhatsAppContactHeader';
import { WhatsAppContactDetails } from './components/WhatsAppContactDetails';
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
  return (
    <Card className="bg-gray-800/50 border-gray-700 hover:border-gray-600 hover:shadow-lg hover:bg-gray-800/70 transition-all duration-200">
      <CardContent className="p-5">
        <WhatsAppContactHeader
          contact={contact}
          isExpanded={isExpanded}
          onToggleExpanded={onToggleExpanded}
        />

        {/* Expanded content */}
        {isExpanded && (
          <WhatsAppContactDetails contact={contact} />
        )}
      </CardContent>
    </Card>
  );
}
