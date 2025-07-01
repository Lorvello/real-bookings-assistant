
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
  intervalMs = 3000
}: AutoProcessorConfig = {}) {
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessTimeRef = useRef<number>(0);
  const processingRef = useRef<boolean>(false);
  const isGlobalRef = useRef<boolean>(!calendarId); // Global if no specific calendar

  useEffect(() => {
    if (!enabled) return;

    const processorType = isGlobalRef.current ? 'GLOBAL' : `CALENDAR-${calendarId}`;
    console.log(`🚀 Starting enhanced ${processorType} webhook auto-processor...`);

    const processWebhooks = async () => {
      // Prevent concurrent processing
      if (processingRef.current) {
        console.log(`⏳ ${processorType} auto-processor already running, skipping...`);
        return;
      }

      try {
        processingRef.current = true;

        // Check for pending webhooks (global or calendar-specific)
        let query = supabase
          .from('webhook_events')
          .select('id, event_type, created_at, calendar_id')
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
          .limit(50);

        // Filter by calendar if not global
        if (calendarId) {
          query = query.eq('calendar_id', calendarId);
        }

        const { data: pendingWebhooks, error: countError } = await query;

        if (countError) throw countError;

        if (pendingWebhooks && pendingWebhooks.length > 0) {
          console.log(`🔄 ${processorType} auto-processing ${pendingWebhooks.length} pending webhooks...`);
          
          const { data, error } = await supabase.functions.invoke('process-webhooks', {
            body: { 
              source: `enhanced-auto-processor-${processorType.toLowerCase()}`,
              calendar_id: calendarId,
              timestamp: new Date().toISOString(),
              batch_size: pendingWebhooks.length,
              processor_type: processorType
            }
          });
          
          if (error) throw error;
          
          if (data?.successful > 0) {
            console.log(`✅ ${processorType} auto-processed ${data.successful}/${data.processed} webhooks successfully`);
            lastProcessTimeRef.current = Date.now();
            
            // Show success toast for significant webhook processing (only for global processor)
            if (data.successful >= 3 && isGlobalRef.current) {
              toast({
                title: "Webhooks verwerkt",
                description: `${data.successful} webhook(s) succesvol verzonden naar n8n`,
              });
            }
          }

          if (data?.failed > 0) {
            console.warn(`⚠️ ${processorType}: ${data.failed} webhooks failed processing`);
          }
        }
      } catch (error) {
        console.error(`❌ ${processorType} auto-processor error:`, error);
        
        // Only show error toast for persistent failures and global processor
        const timeSinceLastError = Date.now() - lastProcessTimeRef.current;
        if (timeSinceLastError > 60000 && isGlobalRef.current) {
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
      .channel(`enhanced-auto-processor-${processorType}`)
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
            console.log(`📨 ${processorType}: New webhook detected, triggering immediate processing...`);
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
            console.log(`✅ ${processorType}: Webhook successfully sent:`, payload.new.event_type);
          } else if (payload.new?.status === 'failed' && payload.old?.status === 'pending') {
            console.log(`❌ ${processorType}: Webhook failed:`, payload.new.event_type);
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 ${processorType} subscription status:`, status);
      });

    // Enhanced pg_notify listener for database triggers
    const notificationChannel = supabase
      .channel(`process-webhooks-notifications-${processorType}`)
      .on('broadcast', { event: 'process_webhooks' }, async (payload) => {
        console.log(`🔔 ${processorType}: Received pg_notify signal:`, payload);
        // Process immediately when triggered by database
        setTimeout(processWebhooks, 500);
      })
      .subscribe();

    // Initial processing run
    setTimeout(processWebhooks, 2000);

    return () => {
      console.log(`🔌 Cleaning up ${processorType} webhook auto-processor`);
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
