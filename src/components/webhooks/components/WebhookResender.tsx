
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
      console.log('🔄 Resending all booking webhooks with updated session_ids...');

      // Trigger resend by updating all bookings to regenerate webhooks
      const { data: bookings, error: fetchError } = await supabase
        .from('bookings')
        .select('id')
        .eq('calendar_id', calendarId);

      if (fetchError) throw fetchError;

      // Update all bookings to trigger webhook regeneration
      if (bookings && bookings.length > 0) {
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ updated_at: new Date().toISOString() })
          .eq('calendar_id', calendarId);

        if (updateError) throw updateError;
      }

      // Process the new webhooks
      setTimeout(async () => {
        const { data: processResult } = await supabase.functions.invoke('process-webhooks', {
          body: { 
            source: 'resend-processor',
            calendar_id: calendarId,
            timestamp: new Date().toISOString()
          }
        });
        
        console.log('✅ Resent webhooks processed:', processResult);
      }, 2000);

      toast({
        title: "Webhooks opnieuw verzonden",
        description: `${bookings?.length || 0} bookings opnieuw verwerkt met bijgewerkte session_ids`,
      });

    } catch (error) {
      console.error('💥 Resend error:', error);
      toast({
        title: "Herverstuurd gefaald",
        description: `Kon webhooks niet herverstuurd: ${error}`,
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
      {resending ? 'Herversturen...' : 'Herverstuurd Alle Webhooks'}
    </Button>
  );
}
