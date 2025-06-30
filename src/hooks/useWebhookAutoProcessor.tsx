
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AutoProcessorConfig {
  calendarId?: string;
  enabled?: boolean;
  intervalMs?: number;
}

export function useWebhookAutoProcessor({ 
  calendarId, 
  enabled = true, 
  intervalMs = 10000 // 10 seconds
}: AutoProcessorConfig = {}) {
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    console.log('🚀 Starting webhook auto-processor...');

    const processWebhooks = async () => {
      try {
        // Check if there are pending webhooks
        const { data: pendingWebhooks, error: countError } = await supabase
          .from('webhook_events')
          .select('id')
          .eq('status', 'pending')
          .eq(calendarId ? 'calendar_id' : 'status', calendarId || 'pending');

        if (countError) throw countError;

        if (pendingWebhooks && pendingWebhooks.length > 0) {
          console.log(`🔄 Auto-processing ${pendingWebhooks.length} pending webhooks...`);
          
          const { data, error } = await supabase.functions.invoke('process-webhooks', {
            body: { 
              source: 'auto-processor',
              calendar_id: calendarId,
              timestamp: new Date().toISOString()
            }
          });
          
          if (error) throw error;
          
          if (data?.successful > 0) {
            console.log(`✅ Auto-processed ${data.successful} webhooks successfully`);
            lastProcessTimeRef.current = Date.now();
          }
        }
      } catch (error) {
        console.error('❌ Auto-processor error:', error);
        // Don't show toast for auto-processor errors to avoid spam
      }
    };

    // Start interval
    intervalRef.current = setInterval(processWebhooks, intervalMs);

    // Also listen for real-time webhook events to trigger immediate processing
    const webhookChannel = supabase
      .channel(`auto-processor-${calendarId || 'global'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webhook_events',
          filter: calendarId ? `calendar_id=eq.${calendarId}` : undefined,
        },
        async (payload) => {
          if (payload.new?.status === 'pending') {
            console.log('📨 New webhook detected, triggering immediate processing...');
            // Small delay to allow for potential batch processing
            setTimeout(processWebhooks, 2000);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up webhook auto-processor');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      supabase.removeChannel(webhookChannel);
    };
  }, [enabled, calendarId, intervalMs, toast]);

  const getLastProcessTime = () => lastProcessTimeRef.current;

  return {
    lastProcessTime: getLastProcessTime()
  };
}
