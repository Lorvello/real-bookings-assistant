
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { User, Calendar, MessageCircle, Phone, Mail, Clock, History } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';

interface ContactSidebarProps {
  conversationId?: string;
}

export function ContactSidebar({ conversationId }: ContactSidebarProps) {
  const { data: conversation } = useQuery({
    queryKey: ['whatsapp-conversation-details', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          whatsapp_contacts (
            id,
            phone_number,
            display_name,
            first_name,
            last_name,
            profile_picture_url,
            linked_customer_email,
            last_seen_at,
            created_at
          )
        `)
        .eq('id', conversationId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });

  const { data: bookingHistory } = useQuery({
    queryKey: ['customer-bookings', conversation?.whatsapp_contacts?.phone_number],
    queryFn: async () => {
      if (!conversation?.whatsapp_contacts?.phone_number) return [];
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          service_types (
            name,
            duration,
            price
          )
        `)
        .eq('customer_phone', conversation.whatsapp_contacts.phone_number)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
    enabled: !!conversation?.whatsapp_contacts?.phone_number,
  });

  const { data: messageStats } = useQuery({
    queryKey: ['conversation-stats', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('direction, created_at')
        .eq('conversation_id', conversationId);
      
      if (error) throw error;
      
      const totalMessages = data.length;
      const inboundMessages = data.filter(m => m.direction === 'inbound').length;
      const outboundMessages = data.filter(m => m.direction === 'outbound').length;
      const firstMessage = data.length > 0 ? data[data.length - 1].created_at : null;
      
      return {
        total: totalMessages,
        inbound: inboundMessages,
        outbound: outboundMessages,
        firstMessage,
      };
    },
    enabled: !!conversationId,
  });

  if (!conversationId) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Selecteer een conversatie om contactgegevens te bekijken</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const contact = conversation?.whatsapp_contacts;

  return (
    <div className="space-y-6 h-full overflow-y-auto">
      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Contact Informatie
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-lg font-medium text-blue-600">
                {contact?.display_name?.[0] || contact?.first_name?.[0] || '?'}
              </span>
            </div>
            <div>
              <h3 className="font-medium">
                {contact?.display_name || 
                 `${contact?.first_name || ''} ${contact?.last_name || ''}`.trim() || 
                 'Onbekende contactpersoon'}
              </h3>
              <p className="text-sm text-gray-500">WhatsApp Contact</p>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-400" />
              <span className="text-sm">{contact?.phone_number}</span>
            </div>
            
            {contact?.linked_customer_email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{contact.linked_customer_email}</span>
              </div>
            )}
            
            {contact?.last_seen_at && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm">
                  Laatst gezien {formatDistanceToNow(new Date(contact.last_seen_at), { 
                    addSuffix: true, 
                    locale: nl 
                  })}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conversation Stats */}
      {messageStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Gesprek Statistieken
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-lg font-bold text-blue-600">{messageStats.total}</div>
                <div className="text-xs text-gray-500">Totaal</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-lg font-bold text-green-600">{messageStats.inbound}</div>
                <div className="text-xs text-gray-500">Inkomend</div>
              </div>
            </div>
            
            {messageStats.firstMessage && (
              <div className="text-center text-sm text-gray-500">
                Gesprek gestart {formatDistanceToNow(new Date(messageStats.firstMessage), { 
                  addSuffix: true, 
                  locale: nl 
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Booking History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Afspraak Geschiedenis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookingHistory?.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Geen afspraken gevonden</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookingHistory?.map((booking) => (
                <div key={booking.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">
                      {booking.service_types?.name || 'Afspraak'}
                    </h4>
                    <Badge 
                      variant={
                        booking.status === 'confirmed' ? 'default' :
                        booking.status === 'cancelled' ? 'destructive' :
                        'secondary'
                      }
                    >
                      {booking.status}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>{new Date(booking.start_time).toLocaleDateString('nl-NL')}</div>
                    <div>{new Date(booking.start_time).toLocaleTimeString('nl-NL', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}</div>
                    {booking.service_types?.price && (
                      <div>€{booking.service_types.price}</div>
                    )}
                  </div>
                </div>
              ))}
              
              {bookingHistory && bookingHistory.length >= 5 && (
                <Button variant="outline" size="sm" className="w-full">
                  Meer afspraken bekijken
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
