
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
      console.log('🔧 Starting booking-WhatsApp link repair...');

      // Get all bookings with phone numbers that don't have booking_intents
      const { data: bookingsNeedingRepair, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, calendar_id, customer_phone, customer_name, service_type_id')
        .eq('calendar_id', calendarId)
        .not('customer_phone', 'is', null);

      if (bookingsError) throw bookingsError;

      let updatedBookings = 0;
      let createdIntents = 0;

      for (const booking of bookingsNeedingRepair || []) {
        try {
          // Check if booking_intent already exists
          const { data: existingIntent } = await supabase
            .from('booking_intents')
            .select('id')
            .eq('booking_id', booking.id)
            .single();

          if (existingIntent) continue; // Skip if already exists

          // Find or create WhatsApp contact
          let { data: contact, error: contactError } = await supabase
            .from('whatsapp_contacts')
            .select('id')
            .eq('phone_number', booking.customer_phone)
            .single();

          if (contactError && contactError.code === 'PGRST116') {
            // Contact doesn't exist, create it
            const { data: newContact, error: createContactError } = await supabase
              .from('whatsapp_contacts')
              .insert({
                phone_number: booking.customer_phone,
                display_name: booking.customer_name
              })
              .select('id')
              .single();

            if (createContactError) throw createContactError;
            contact = newContact;
          } else if (contactError) {
            throw contactError;
          }

          // Find or create conversation
          let { data: conversation, error: conversationError } = await supabase
            .from('whatsapp_conversations')
            .select('id')
            .eq('contact_id', contact.id)
            .eq('calendar_id', booking.calendar_id)
            .single();

          if (conversationError && conversationError.code === 'PGRST116') {
            // Conversation doesn't exist, create it
            const { data: newConversation, error: createConversationError } = await supabase
              .from('whatsapp_conversations')
              .insert({
                contact_id: contact.id,
                calendar_id: booking.calendar_id,
                status: 'active'
              })
              .select('id')
              .single();

            if (createConversationError) throw createConversationError;
            conversation = newConversation;
          } else if (conversationError) {
            throw conversationError;
          }

          // Create booking_intent
          const { error: intentError } = await supabase
            .from('booking_intents')
            .insert({
              conversation_id: conversation.id,
              service_type_id: booking.service_type_id,
              status: 'booked',
              booking_id: booking.id,
              collected_data: {
                customer_name: booking.customer_name,
                linked_retroactively: true
              }
            });

          if (intentError) throw intentError;

          createdIntents++;
          updatedBookings++;

        } catch (error) {
          console.error(`Error repairing booking ${booking.id}:`, error);
        }
      }

      const repairResults: RepairResult = {
        updated_bookings: updatedBookings,
        created_intents: createdIntents
      };

      onResultsUpdate({ repairResults });

      toast({
        title: "Koppeling gerepareerd",
        description: `${updatedBookings} bookings gekoppeld aan WhatsApp`,
      });

    } catch (error) {
      console.error('💥 Repair error:', error);
      toast({
        title: "Reparatie gefaald",
        description: `Kon bookings niet koppelen: ${error}`,
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
      {repairing ? 'Repareren...' : 'Repareer Koppelingen'}
    </Button>
  );
}
