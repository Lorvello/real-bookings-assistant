import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RealtimeConnectionStatus {
  isConnected: boolean;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastConnected?: Date;
}

export function useRealtimeConnectionStatus(calendarId?: string): RealtimeConnectionStatus {
  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>({
    isConnected: false,
    status: 'disconnected'
  });

  useEffect(() => {
    if (!calendarId) {
      setConnectionStatus({ isConnected: false, status: 'disconnected' });
      return;
    }

    setConnectionStatus(prev => ({ ...prev, status: 'connecting' }));

    // Create a test channel to monitor connection status
    const testChannel = supabase
      .channel(`connection-test-${calendarId}`)
      .subscribe((status) => {
        console.log('📡 Realtime connection status:', status);
        
        switch (status) {
          case 'SUBSCRIBED':
            setConnectionStatus({
              isConnected: true,
              status: 'connected',
              lastConnected: new Date()
            });
            break;
          case 'CHANNEL_ERROR':
          case 'TIMED_OUT':
            setConnectionStatus({
              isConnected: false,
              status: 'error'
            });
            break;
          case 'CLOSED':
            setConnectionStatus({
              isConnected: false,
              status: 'disconnected'
            });
            break;
          default:
            setConnectionStatus(prev => ({
              ...prev,
              status: 'connecting'
            }));
        }
      });

    return () => {
      supabase.removeChannel(testChannel);
      setConnectionStatus({ isConnected: false, status: 'disconnected' });
    };
  }, [calendarId]);

  return connectionStatus;
}