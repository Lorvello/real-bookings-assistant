
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWhatsAppContactOverview, useRefreshWhatsAppContactOverview } from '@/hooks/useWhatsAppContactOverview';
import { MessageCircle, RefreshCw, Users, Search } from 'lucide-react';
import { WhatsAppContactFilters } from './WhatsAppContactFilters';
import { WhatsAppContactCard } from './WhatsAppContactCard';
import type { WhatsAppContactOverview as WhatsAppContact } from '@/types/whatsappOverview';

interface WhatsAppContactOverviewProps {
  calendarId?: string;
}

export function WhatsAppContactOverview({ calendarId }: WhatsAppContactOverviewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedContact, setExpandedContact] = useState<string | null>(null);

  // showAll = true: toon ALLE contacts van alle businesses
  const { data: contacts, isLoading, error } = useWhatsAppContactOverview(calendarId, true);
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
      <Card className="bg-gray-800/90 border-gray-700 shadow-xl">
        <CardHeader className="border-b border-gray-700 bg-gray-800/50">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-green-400" />
            </div>
            <span className="text-white">WhatsApp Contact Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-700/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gray-800/90 border-red-500/30 shadow-xl">
        <CardHeader className="border-b border-red-500/30 bg-red-900/20">
          <CardTitle className="flex items-center gap-3 text-lg text-red-300">
            <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-red-400" />
            </div>
            WhatsApp Contact Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-lg font-medium text-red-300 mb-2">Error loading contacts</h3>
            <p className="text-red-400 mb-4">A problem occurred while retrieving contact data.</p>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              className="border-red-500/30 text-red-300 hover:bg-red-500/10 hover:border-red-400"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800/90 border-gray-700 shadow-xl">
      <CardHeader className="border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <div className="text-lg font-semibold text-white">WhatsApp Contacts</div>
              <div className="text-sm text-gray-400 font-normal flex items-center gap-2 mt-1">
                <Users className="w-4 h-4" />
                {filteredContacts.length} {filteredContacts.length === 1 ? 'contact' : 'contacts'}
              </div>
            </div>
          </CardTitle>
          
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={refreshMutation.isPending}
            className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
            Refresh
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
            <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              {searchTerm ? (
                <Search className="w-8 h-8 text-gray-500" />
              ) : (
                <MessageCircle className="w-8 h-8 text-gray-500" />
              )}
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              {searchTerm ? 'No results found' : 'No contacts'}
            </h3>
            <p className="text-gray-400 mb-4">
              {searchTerm 
                ? `No contacts found for "${searchTerm}"`
                : 'There are no WhatsApp contacts in this system yet.'
              }
            </p>
            {searchTerm && (
              <Button 
                variant="outline" 
                onClick={() => setSearchTerm('')}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <Search className="w-4 h-4 mr-2" />
                Clear search
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
