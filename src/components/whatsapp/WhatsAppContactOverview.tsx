
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useWhatsAppContactOverview, useRefreshWhatsAppContactOverview } from '@/hooks/useWhatsAppContactOverview';
import { 
  Phone, 
  MessageCircle, 
  Calendar, 
  Clock, 
  User, 
  Search,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { WhatsAppContactOverview } from '@/types/whatsappOverview';

interface WhatsAppContactOverviewProps {
  calendarId: string;
}

export function WhatsAppContactOverview({ calendarId }: WhatsAppContactOverviewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedContact, setExpandedContact] = useState<string | null>(null);

  const { data: contacts, isLoading, error } = useWhatsAppContactOverview(calendarId);
  const refreshMutation = useRefreshWhatsAppContactOverview();

  const filteredContacts = contacts?.filter(contact => {
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

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      case 'archived': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getBookingStatusColor = (status?: string) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Nooit';
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
  };

  const formatPhone = (phone: string) => {
    // Format phone number for better readability
    if (phone.startsWith('+31')) {
      return phone.replace('+31', '0').replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
    }
    return phone;
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
        
        <div className="flex gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Zoek op naam of telefoonnummer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">Alle contacten</option>
              <option value="active">Actieve gesprekken</option>
              <option value="with_bookings">Met boekingen</option>
              <option value="recent">Recent actief</option>
            </select>
          </div>
        </div>
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
            {filteredContacts.map((contact) => (
              <div key={contact.contact_id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
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
                      onClick={() => setExpandedContact(
                        expandedContact === contact.contact_id ? null : contact.contact_id
                      )}
                    >
                      {expandedContact === contact.contact_id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {expandedContact === contact.contact_id && (
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
                          Laatste booking
                        </h4>
                        {contact.laatste_booking ? (
                          <div className="space-y-1 text-gray-600">
                            <p>Service: {contact.laatste_service || 'Onbekend'}</p>
                            <p>Datum: {formatDate(contact.laatste_booking)}</p>
                            {contact.booking_status && (
                              <Badge className={getBookingStatusColor(contact.booking_status)}>
                                {contact.booking_status}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-500">Geen boekingen gevonden</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
