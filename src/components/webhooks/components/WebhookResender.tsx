
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Wrench } from 'lucide-react';

interface WebhookResenderProps {
  calendarId: string;
}

export function WebhookResender({ calendarId }: WebhookResenderProps) {
  const [resending, setResending] = useState(false);
  const { toast } = useToast();

  const resendAllWebhooks = async () => {
    setResending(true);
    try {
      console.log('🔄 Enhanced resending all booking webhooks with complete data and session_ids...');

      // Stap 1: Haal alle bookings op
      const { data: bookings, error: fetchError } = await supabase
        .from('bookings')
        .select('id, customer_phone, customer_name')
        .eq('calendar_id', calendarId);

      if (fetchError) throw fetchError;

      console.log(`📊 Found ${bookings?.length || 0} bookings to resend`);

      // Stap 2: Voor elke booking, zorg dat er een session_id is
      for (const booking of bookings || []) {
        if (booking.customer_phone) {
          // Maak of update WhatsApp contact
          const { data: contact } = await supabase
            .from('whatsapp_contacts')
            .upsert(
              { 
                phone_number: booking.customer_phone,
                display_name: booking.customer_name 
              },
              { onConflict: 'phone_number' }
            )
            .select('id')
            .single();

          if (contact) {
            // Maak of update conversation met session_id
            const sessionId = `session_${booking.customer_phone.substring(1)}_${Date.now()}`;
            
            await supabase
              .from('whatsapp_conversations')
              .upsert(
                {
                  contact_id: contact.id,
                  calendar_id: calendarId,
                  session_id: sessionId,
                  status: 'active'
                },
                { onConflict: 'calendar_id,contact_id' }
              );
          }
        }

        // Update booking om webhook trigger te activeren
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', booking.id);

        if (updateError) {
          console.error(`Error updating booking ${booking.id}:`, updateError);
        }
      }

      // Stap 3: Process de nieuwe webhooks na een korte delay
      setTimeout(async () => {
        const { data: processResult } = await supabase.functions.invoke('process-webhooks', {
          body: { 
            source: 'enhanced-resend-processor',
            calendar_id: calendarId,
            timestamp: new Date().toISOString(),
            force_process: true
          }
        });
        
        console.log('✅ Enhanced resent webhooks processed:', processResult);
      }, 3000);

      toast({
        title: "Enhanced webhooks opnieuw verzonden",
        description: `${bookings?.length || 0} bookings opnieuw verwerkt met complete data en session_ids`,
      });

    } catch (error) {
      console.error('💥 Enhanced resend error:', error);
      toast({
        title: "Enhanced herverstuurd gefaald",
        description: `Kon enhanced webhooks niet herverstuurd: ${error}`,
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <Button
      onClick={resendAllWebhooks}
      disabled={resending}
      variant="outline"
      size="lg"
      className="border-purple-200 text-purple-700 hover:bg-purple-50"
    >
      <Wrench className="w-4 h-4 mr-2" />
      {resending ? 'Enhanced Resending...' : 'Enhanced Resend All'}
    </Button>
  );
}
