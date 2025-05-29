
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

interface CalendarConnection {
  id: string;
  provider: string;
  provider_account_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CalendarIntegrationState {
  connections: CalendarConnection[];
  loading: boolean;
  syncing: boolean;
}

export const useCalendarIntegration = (user: User | null) => {
  const [state, setState] = useState<CalendarIntegrationState>({
    connections: [],
    loading: true,
    syncing: false
  });
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchConnections();
    } else {
      setState({ connections: [], loading: false, syncing: false });
    }
  }, [user]);

  const fetchConnections = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('calendar_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching calendar connections:', error);
        toast({
          title: "Error",
          description: "Failed to fetch calendar connections",
          variant: "destructive",
        });
        return;
      }

      setState(prev => ({ ...prev, connections: data || [], loading: false }));
    } catch (error) {
      console.error('Unexpected error fetching connections:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const connectProvider = async (provider: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        return { success: false, error: 'No active session' };
      }

      // Initialize OAuth flow
      const response = await supabase.functions.invoke(`${provider}-calendar-auth`, {
        body: { action: 'init' },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        }
      });

      if (response.error) {
        return { success: false, error: response.error.message };
      }

      const { authUrl } = response.data;
      
      // Open OAuth popup
      const popup = window.open(authUrl, 'oauth', 'width=500,height=600');
      
      return new Promise((resolve) => {
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            // Refresh connections after OAuth flow
            setTimeout(() => {
              fetchConnections();
            }, 1000);
            resolve({ success: true });
          }
        }, 1000);
      });

    } catch (error) {
      console.error('Error connecting provider:', error);
      return { success: false, error: error.message };
    }
  };

  const disconnectProvider = async (connectionId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('calendar_connections')
        .update({ is_active: false })
        .eq('id', connectionId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error disconnecting provider:', error);
        toast({
          title: "Error",
          description: "Failed to disconnect calendar",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Calendar disconnected successfully",
      });

      await fetchConnections();
      return true;

    } catch (error) {
      console.error('Unexpected error disconnecting provider:', error);
      return false;
    }
  };

  const syncCalendarEvents = async (): Promise<boolean> => {
    if (!user) return false;

    setState(prev => ({ ...prev, syncing: true }));

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        setState(prev => ({ ...prev, syncing: false }));
        return false;
      }

      const response = await supabase.functions.invoke('sync-calendar-events', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        }
      });

      if (response.error) {
        console.error('Error syncing calendar events:', response.error);
        toast({
          title: "Sync Error",
          description: "Failed to sync calendar events",
          variant: "destructive",
        });
        setState(prev => ({ ...prev, syncing: false }));
        return false;
      }

      toast({
        title: "Success",
        description: "Calendar events synced successfully",
      });

      setState(prev => ({ ...prev, syncing: false }));
      return true;

    } catch (error) {
      console.error('Unexpected error syncing events:', error);
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
    connectProvider,
    disconnectProvider,
    syncCalendarEvents,
    getConnectionByProvider,
    isProviderConnected,
    refetch: fetchConnections
  };
};
