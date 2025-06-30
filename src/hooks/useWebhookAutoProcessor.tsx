
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
  intervalMs = 3000 // Verlaagd van 5000 naar 3000ms voor snellere processing
}: AutoProcessorConfig = {}) {
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessTimeRef = useRef<number>(0);
  const processingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled) return;

    console.log('🚀 Starting enhanced real-time webhook auto-processor...');

    const processWebhooks = async () => {
      // Prevent concurrent processing
      if (processingRef.current) {
        console.log('⏳ Auto-processor already running, skipping...');
        return;
      }

      try {
        processingRef.current = true;

        // Check if there are pending webhooks
        const { data: pendingWebhooks, error: countError } = await supabase
          .from('webhook_events')
          .select('id, event_type, created_at')
          .eq('status', 'pending')
          .eq(calendarId ? 'calendar_id' : 'status', calendarId || 'pending')
          .order('created_at', { ascending: true })
          .limit(50);

        if (countError) throw countError;

        if (pendingWebhooks && pendingWebhooks.length > 0) {
          console.log(`🔄 Auto-processing ${pendingWebhooks.length} pending webhooks...`);
          
          const { data, error } = await supabase.functions.invoke('process-webhooks', {
            body: { 
              source: 'enhanced-auto-processor',
              calendar_id: calendarId,
              timestamp: new Date().toISOString(),
              batch_size: pendingWebhooks.length
            }
          });
          
          if (error) throw error;
          
          if (data?.successful > 0) {
            console.log(`✅ Enhanced auto-processed ${data.successful}/${data.processed} webhooks successfully`);
            lastProcessTimeRef.current = Date.now();
            
            // Show success toast for significant webhook processing
            if (data.successful >= 5) {
              toast({
                title: "Webhooks verwerkt",
                description: `${data.successful} webhook(s) succesvol verzonden naar n8n`,
              });
            }
          }

          if (data?.failed > 0) {
            console.warn(`⚠️ ${data.failed} webhooks failed processing`);
          }
        }
      } catch (error) {
        console.error('❌ Enhanced auto-processor error:', error);
        // Only show error toast for persistent failures
        const timeSinceLastError = Date.now() - lastProcessTimeRef.current;
        if (timeSinceLastError > 60000) { // Only show error once per minute
          toast({
            title: "Webhook processing issue",
            description: "Er is een tijdelijk probleem met webhook verwerking",
            variant: "destructive",
          });
        }
      } finally {
        processingRef.current = false;
      }
    };

    // Start interval processing
    intervalRef.current = setInterval(processWebhooks, intervalMs);

    // Enhanced real-time webhook event listener
    const webhookChannel = supabase
      .channel(`enhanced-auto-processor-${calendarId || 'global'}`)
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
            console.log('📨 New webhook detected, triggering immediate enhanced processing...');
            // Immediate processing for new webhooks
            setTimeout(processWebhooks, 1000);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'webhook_events',
          filter: calendarId ? `calendar_id=eq.${calendarId}` : undefined,
        },
        (payload) => {
          if (payload.new?.status === 'sent' && payload.old?.status === 'pending') {
            console.log('✅ Webhook successfully sent to n8n:', payload.new.event_type);
          } else if (payload.new?.status === 'failed' && payload.old?.status === 'pending') {
            console.log('❌ Webhook failed:', payload.new.event_type);
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 Enhanced auto-processor subscription status for ${calendarId || 'global'}:`, status);
      });

    // Enhanced pg_notify listener for database triggers
    const notificationChannel = supabase
      .channel(`process-webhooks-notifications-${calendarId || 'global'}`)
      .on('broadcast', { event: 'process_webhooks' }, async (payload) => {
        console.log('🔔 Received enhanced pg_notify signal:', payload);
        // Process immediately when triggered by database
        setTimeout(processWebhooks, 500);
      })
      .subscribe();

    // Initial processing run
    setTimeout(processWebhooks, 2000);

    return () => {
      console.log('🔌 Cleaning up enhanced webhook auto-processor');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      processingRef.current = false;
      supabase.removeChannel(webhookChannel);
      supabase.removeChannel(notificationChannel);
    };
  }, [enabled, calendarId, intervalMs, toast]);

  const getLastProcessTime = () => lastProcessTimeRef.current;
  const isProcessing = () => processingRef.current;

  return {
    lastProcessTime: getLastProcessTime(),
    isProcessing: isProcessing()
  };
}
