
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWhatsAppContactOverview, useRefreshWhatsAppContactOverview } from '@/hooks/useWhatsAppContactOverview';
import { MessageCircle, RefreshCw, Users, Search } from 'lucide-react';
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

  const handleToggleExpanded = (contactId: string) => {
    setExpandedContact(expandedContact === contactId ? null : contactId);
  };

  if (isLoading) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100 bg-gray-50/50">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-blue-600" />
            </div>
            WhatsApp Contacten Overzicht
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white border border-red-200 shadow-sm">
        <CardHeader className="border-b border-red-100 bg-red-50/50">
          <CardTitle className="flex items-center gap-3 text-lg text-red-800">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-red-600" />
            </div>
            WhatsApp Contacten Overzicht
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-red-800 mb-2">Fout bij laden van contacten</h3>
            <p className="text-red-600 mb-4">Er is een probleem opgetreden bij het ophalen van de contactgegevens.</p>
            <Button onClick={handleRefresh} variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
              <RefreshCw className="w-4 h-4 mr-2" />
              Opnieuw proberen
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader className="border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">WhatsApp Contacten</div>
              <div className="text-sm text-gray-600 font-normal flex items-center gap-2 mt-1">
                <Users className="w-4 h-4" />
                {filteredContacts.length} {filteredContacts.length === 1 ? 'contact' : 'contacten'}
              </div>
            </div>
          </CardTitle>
          
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={refreshMutation.isPending}
            className="border-gray-200 hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
            Vernieuwen
          </Button>
        </div>
        
        <div className="mt-4">
          <WhatsAppContactFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
          />
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {filteredContacts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {searchTerm ? (
                <Search className="w-8 h-8 text-gray-400" />
              ) : (
                <MessageCircle className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'Geen resultaten gevonden' : 'Geen contacten'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? `Geen contacten gevonden voor "${searchTerm}"`
                : 'Er zijn nog geen WhatsApp contacten in dit systeem.'
              }
            </p>
            {searchTerm && (
              <Button 
                variant="outline" 
                onClick={() => setSearchTerm('')}
                className="border-gray-200 hover:bg-gray-50"
              >
                <Search className="w-4 h-4 mr-2" />
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
                onToggleExpanded={() => handleToggleExpanded(contact.contact_id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
