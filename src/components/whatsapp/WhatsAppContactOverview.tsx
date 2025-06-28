
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWhatsAppContactOverview, useRefreshWhatsAppContactOverview } from '@/hooks/useWhatsAppContactOverview';
import { MessageCircle, RefreshCw } from 'lucide-react';
import { WhatsAppContactFilters } from './WhatsAppContactFilters';
import { WhatsAppContactCard } from './WhatsAppContactCard';
import type { WhatsAppContactOverview as WhatsAppContact } from '@/types/whatsappOverview';

interface WhatsAppContactOverviewProps {
  calendarId: string;
}

export function WhatsAppContactOverview({ calendarId }: WhatsAppContactOverviewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedContact, setExpandedContact] = useState<string | null>(null);

  const { data: contacts, isLoading, error } = useWhatsAppContactOverview(calendarId);
  const refreshMutation = useRefreshWhatsAppContactOverview();

  const filteredContacts = contacts?.filter((contact: WhatsAppContact) => {
    const matchesSearch = 
      contact.phone_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.last_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'active' && contact.conversation_status === 'active') ||
      (filterStatus === 'with_bookings' && contact.booking_id) ||
      (filterStatus === 'recent' && contact.last_message_at && 
        new Date(contact.last_message_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

    return matchesSearch && matchesFilter;
  }) || [];

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            WhatsApp Contacten Overzicht
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            WhatsApp Contacten Overzicht
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">Fout bij laden van contacten</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Opnieuw proberen
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            WhatsApp Contacten Overzicht ({filteredContacts.length})
          </CardTitle>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={refreshMutation.isPending}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
            Vernieuwen
          </Button>
        </div>
        
        <WhatsAppContactFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
        />
      </CardHeader>
      
      <CardContent>
        {filteredContacts.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Geen contacten gevonden</p>
            {searchTerm && (
              <Button 
                variant="ghost" 
                onClick={() => setSearchTerm('')}
                className="mt-2"
              >
                Wis zoekopdracht
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredContacts.map((contact: WhatsAppContact) => (
              <WhatsAppContactCard
                key={contact.contact_id}
                contact={contact}
                isExpanded={expandedContact === contact.contact_id}
                onToggleExpanded={() => setExpandedContact(
                  expandedContact === contact.contact_id ? null : contact.contact_id
                )}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
