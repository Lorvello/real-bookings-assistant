
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'lucide-react';
import { RepairResult, BulkProcessingResults } from '../types/webhookTypes';

interface BookingRepairProps {
  calendarId: string;
  onResultsUpdate: (results: Partial<BulkProcessingResults>) => void;
}

export function BookingRepair({ calendarId, onResultsUpdate }: BookingRepairProps) {
  const [repairing, setRepairing] = useState(false);
  const { toast } = useToast();

  const repairBookingLinks = async () => {
    setRepairing(true);
    try {
      console.log('🔧 Starting enhanced booking-WhatsApp link repair...');

      // Stap 1: Gebruik de bestaande link_existing_whatsapp_conversations functie
      const { error: linkError } = await supabase.rpc('link_existing_whatsapp_conversations');
      if (linkError) {
        console.error('Error linking conversations:', linkError);
        throw linkError;
      }

      console.log('✅ Linked existing WhatsApp conversations to calendars');

      // Stap 2: Count conversations linked to this calendar
      const { data: conversationsLinked } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('calendar_id', calendarId);

      const conversationsCount = conversationsLinked?.length || 0;
      console.log(`✅ Found ${conversationsCount} conversations linked to calendar`);

      // Stap 3: Maak booking_intents aan voor bookings zonder intents
      const { data: bookingsNeedingIntents } = await supabase
        .from('bookings')
        .select(`
          id, calendar_id, customer_phone, customer_name, service_type_id,
          whatsapp_contacts!left (
            id,
            whatsapp_conversations!inner (
              id, session_id
            )
          )
        `)
        .eq('calendar_id', calendarId)
        .not('customer_phone', 'is', null);

      let intentsCreated = 0;
      for (const booking of bookingsNeedingIntents || []) {
        try {
          // Check if booking_intent already exists
          const { data: existingIntent } = await supabase
            .from('booking_intents')
            .select('id')
            .eq('booking_id', booking.id)
            .single();

          if (existingIntent) continue; // Skip if already exists

          // Find WhatsApp contact and conversation
          const { data: contact } = await supabase
            .from('whatsapp_contacts')
            .select(`
              id,
              whatsapp_conversations!inner (
                id
              )
            `)
            .eq('phone_number', booking.customer_phone)
            .single();

          if (contact && contact.whatsapp_conversations && contact.whatsapp_conversations.length > 0) {
            const conversationData = contact.whatsapp_conversations[0] as unknown as { id: string };
            
            // Create booking_intent
            const { error: intentError } = await supabase
              .from('booking_intents')
              .insert({
                conversation_id: conversationData.id,
                service_type_id: booking.service_type_id,
                status: 'booked',
                booking_id: booking.id,
                collected_data: {
                  customer_name: booking.customer_name,
                  linked_retroactively: true
                }
              });

            if (!intentError) {
              intentsCreated++;
              console.log(`✅ Created booking_intent for booking ${booking.id}`);
            }
          }
        } catch (error) {
          console.error(`Error creating intent for booking ${booking.id}:`, error);
        }
      }

      const repairResults: RepairResult = {
        updated_bookings: conversationsCount,
        created_intents: intentsCreated
      };

      onResultsUpdate({ repairResults });

      toast({
        title: "Enhanced koppeling gerepareerd",
        description: `${conversationsCount} conversations gelinkt, ${intentsCreated} booking_intents gekoppeld`,
      });

    } catch (error) {
      console.error('💥 Enhanced repair error:', error);
      toast({
        title: "Enhanced reparatie gefaald",
        description: `Kon enhanced koppelingen niet repareren: ${error}`,
        variant: "destructive",
      });
    } finally {
      setRepairing(false);
    }
  };

  return (
    <Button
      onClick={repairBookingLinks}
      disabled={repairing}
      variant="outline"
      size="lg"
      className="border-orange-200 text-orange-700 hover:bg-orange-50"
    >
      <Link className="w-4 h-4 mr-2" />
      {repairing ? 'Enhanced Repair...' : 'Enhanced Repair Links'}
    </Button>
  );
}
