import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RealtimeStatus {
  isConnected: boolean;
  connectionCount: number;
  totalCalendars: number;
  lastChecked: string;
}

export function useMultipleCalendarRealtimeStatus(calendarIds: string[]) {
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>({
    isConnected: false,
    connectionCount: 0,
    totalCalendars: 0,
    lastChecked: new Date().toISOString()
  });

  useEffect(() => {
    if (!calendarIds || calendarIds.length === 0) {
      setRealtimeStatus({
        isConnected: false,
        connectionCount: 0,
        totalCalendars: 0,
        lastChecked: new Date().toISOString()
      });
      return;
    }

    let connectedCount = 0;
    const channels: any[] = [];

    console.log('🔄 Testing realtime connections for calendars:', calendarIds);

    // Test connection for each calendar
    calendarIds.forEach((calendarId, index) => {
      const testChannel = supabase
        .channel(`realtime-test-${calendarId}-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookings',
            filter: `calendar_id=eq.${calendarId}`,
          },
          (payload) => {
            console.log(`📡 Realtime test response for calendar ${calendarId}:`, payload);
          }
        )
        .subscribe((status) => {
          console.log(`📊 Calendar ${calendarId} realtime status:`, status);
          
          if (status === 'SUBSCRIBED') {
            connectedCount++;
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            connectedCount = Math.max(0, connectedCount - 1);
          }

          // Update status when all calendars have been tested
          if (index === calendarIds.length - 1) {
            setTimeout(() => {
              setRealtimeStatus({
                isConnected: connectedCount === calendarIds.length,
                connectionCount: connectedCount,
                totalCalendars: calendarIds.length,
                lastChecked: new Date().toISOString()
              });
            }, 1000); // Give some time for all connections to establish
          }
        });

      channels.push(testChannel);
    });

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up realtime test channels');
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [calendarIds]);

  return realtimeStatus;
}