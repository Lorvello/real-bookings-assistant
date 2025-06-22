
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useRealtimeWebSocket(calendarId?: string) {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!calendarId) return;

    const connectWebSocket = () => {
      try {
        // Use the deployed edge function URL
        const wsUrl = `wss://grdgjhkygzciwwrxgvgy.supabase.co/functions/v1/realtime-dashboard`;
        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          console.log('🔗 Real-time WebSocket connected');
          
          // Subscribe to calendar updates
          wsRef.current?.send(JSON.stringify({
            type: 'subscribe',
            calendarId: calendarId
          }));
        };

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📡 Real-time update received:', data);

            switch (data.type) {
              case 'booking_update':
                // Invalidate all dashboard queries immediately
                queryClient.invalidateQueries({ queryKey: ['optimized-live-operations', calendarId] });
                queryClient.invalidateQueries({ queryKey: ['optimized-business-intelligence', calendarId] });
                queryClient.invalidateQueries({ queryKey: ['optimized-performance-efficiency', calendarId] });
                queryClient.invalidateQueries({ queryKey: ['optimized-future-insights', calendarId] });
                break;
              
              case 'whatsapp_update':
                // Invalidate WhatsApp related queries
                queryClient.invalidateQueries({ queryKey: ['optimized-live-operations', calendarId] });
                queryClient.invalidateQueries({ queryKey: ['optimized-business-intelligence', calendarId] });
                break;
            }
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
          }
        };

        wsRef.current.onclose = () => {
          console.log('🔌 WebSocket connection closed, attempting to reconnect...');
          
          // Attempt to reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, 3000);
        };

        wsRef.current.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
        };

      } catch (error) {
        console.error('❌ Failed to connect WebSocket:', error);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [calendarId, queryClient]);
}
