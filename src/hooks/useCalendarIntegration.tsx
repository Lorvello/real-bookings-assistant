
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { CalendarIntegrationState } from '@/types/calendar';
import { fetchCalendarConnections, disconnectCalendarProvider } from '@/utils/calendarConnectionUtils';
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
      const connections = await fetchCalendarConnections(user);
      setState(prev => ({ ...prev, connections, loading: false }));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch calendar connections",
        variant: "destructive",
      });
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const disconnectProvider = async (connectionId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const success = await disconnectCalendarProvider(user, connectionId);
      
      if (success) {
        toast({
          title: "Success",
          description: "Calendar disconnected successfully",
        });
        await fetchConnections();
      } else {
        toast({
          title: "Error",
          description: "Failed to disconnect calendar",
          variant: "destructive",
        });
      }

      return success;
    } catch (error) {
      return false;
    }
  };

  const handleSyncCalendarEvents = async (): Promise<boolean> => {
    if (!user) return false;

    setState(prev => ({ ...prev, syncing: true }));

    try {
      await syncCalendarEvents(user);
      
      toast({
        title: "Success",
        description: "Calendar events synced successfully",
      });

      setState(prev => ({ ...prev, syncing: false }));
      return true;
    } catch (error) {
      setState(prev => ({ ...prev, syncing: false }));
      toast({
        title: "Error",
        description: "Failed to sync calendar events",
        variant: "destructive",
      });
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
