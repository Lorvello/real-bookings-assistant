
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { CalendarIntegrationState } from '@/types/calendar';
import { fetchCalendarConnections } from '@/utils/calendar/connectionManager';
import { disconnectCalendarProvider } from '@/utils/calendar/connectionDisconnect';
import { syncCalendarEvents } from '@/utils/calendarSync';

export const useCalendarIntegration = (user: User | null) => {
  const [state, setState] = useState<CalendarIntegrationState>({
    connections: [],
    loading: true,
    syncing: false,
    connectionStatus: 'idle',
    errorMessage: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchConnections();
    } else {
      setState(prev => ({ ...prev, connections: [], loading: false }));
    }
  }, [user]);

  const fetchConnections = async () => {
    if (!user) return;

    try {
      console.log('[CalendarIntegration] Fetching connections for user:', user.id);
      const connections = await fetchCalendarConnections(user);
      console.log('[CalendarIntegration] Fetched connections:', connections.length);
      setState(prev => ({ ...prev, connections, loading: false }));
    } catch (error) {
      console.error('[CalendarIntegration] Error fetching connections:', error);
      toast({
        title: "Error",
        description: "Failed to fetch calendar connections",
        variant: "destructive",
      });
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const disconnectProvider = async (connectionId: string): Promise<boolean> => {
    if (!user) {
      console.error('[CalendarIntegration] No user for disconnect');
      return false;
    }

    try {
      console.log('[CalendarIntegration] Disconnecting provider:', connectionId);
      const success = await disconnectCalendarProvider(user, connectionId);
      
      if (success) {
        console.log('[CalendarIntegration] Disconnect successful, refreshing connections');
        await fetchConnections();
      } else {
        console.error('[CalendarIntegration] Disconnect failed');
      }

      return success;
    } catch (error) {
      console.error('[CalendarIntegration] Error in disconnectProvider:', error);
      return false;
    }
  };

  const handleSyncCalendarEvents = async (): Promise<boolean> => {
    if (!user) return false;

    setState(prev => ({ ...prev, syncing: true }));

    try {
      console.log('[CalendarIntegration] Starting calendar sync');
      await syncCalendarEvents(user);
      
      console.log('[CalendarIntegration] Calendar sync completed successfully');
      setState(prev => ({ ...prev, syncing: false }));
      return true;
    } catch (error) {
      console.error('[CalendarIntegration] Calendar sync failed:', error);
      setState(prev => ({ ...prev, syncing: false }));
      return false;
    }
  };

  const getConnectionByProvider = (provider: string) => {
    return state.connections.find(conn => conn.provider === provider);
  };

  const isProviderConnected = (provider: string) => {
    return state.connections.some(conn => conn.provider === provider && conn.is_active);
  };

  return {
    connections: state.connections,
    loading: state.loading,
    syncing: state.syncing,
    connectionStatus: state.connectionStatus,
    errorMessage: state.errorMessage,
    disconnectProvider,
    syncCalendarEvents: handleSyncCalendarEvents,
    getConnectionByProvider,
    isProviderConnected,
    refetch: fetchConnections
  };
};
