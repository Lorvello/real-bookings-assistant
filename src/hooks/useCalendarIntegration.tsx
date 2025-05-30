import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { CalendarIntegrationState, CalendarConnection } from '@/types/calendar';
import { 
  fetchCalendarConnections, 
  disconnectCalendarProvider, 
  resetAllCalendarConnections 
} from '@/utils/calendarConnectionUtils';
import { connectOutlookCalendar } from '@/utils/outlookCalendarOAuth';
import { syncCalendarEvents, handleOAuthCallback as handleCallback } from '@/utils/calendarSync';
import { supabase } from '@/integrations/supabase/client';

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

  const handleConnectGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'User not authenticated' };

    setState(prev => ({ ...prev, connectionStatus: 'connecting', errorMessage: '' }));

    try {
      console.log('[CalendarIntegration] Starting Google OAuth via Supabase...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
        }
      });

      if (error) {
        console.error('[CalendarIntegration] Google OAuth error:', error);
        setState(prev => ({ ...prev, connectionStatus: 'error', errorMessage: error.message }));
        toast({
          title: "Connection Error",
          description: error.message,
          variant: "destructive",
        });
        return { success: false, error: error.message };
      }

      console.log('[CalendarIntegration] Google OAuth initiated successfully');
      // User will be redirected to Google, then back to our callback
      return { success: true };
    } catch (error: any) {
      console.error('[CalendarIntegration] Unexpected Google connection error:', error);
      setState(prev => ({ ...prev, connectionStatus: 'error', errorMessage: error.message }));
      toast({
        title: "Connection Error",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error: error.message };
    }
  };

  const handleConnectOutlook = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'User not authenticated' };

    setState(prev => ({ ...prev, connectionStatus: 'connecting', errorMessage: '' }));

    try {
      const result = await connectOutlookCalendar(user);
      
      if (!result.success) {
        setState(prev => ({ ...prev, connectionStatus: 'error', errorMessage: result.error || '' }));
        toast({
          title: "Configuration Error",
          description: result.error,
          variant: "destructive",
        });
      }

      return result;
    } catch (error: any) {
      setState(prev => ({ ...prev, connectionStatus: 'error', errorMessage: error.message }));
      toast({
        title: "Connection Error",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error: error.message };
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

  const resetAllConnections = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const success = await resetAllCalendarConnections(user);
      
      if (success) {
        toast({
          title: "Success",
          description: "All calendar connections have been reset",
        });
        setState(prev => ({ 
          ...prev, 
          connections: [], 
          connectionStatus: 'idle',
          errorMessage: ''
        }));
      } else {
        toast({
          title: "Error",
          description: "Failed to reset connections",
          variant: "destructive",
        });
      }

      return success;
    } catch (error) {
      return false;
    }
  };

  const handleOAuthCallback = async (code: string, state: string, provider: string = 'microsoft') => {
    if (!user) return false;

    try {
      // Only handle Microsoft callbacks - Google is handled by Supabase Auth
      if (provider === 'microsoft') {
        const success = await handleCallback(code, state, provider, user);
        
        if (success) {
          setState(prev => ({ ...prev, connectionStatus: 'connected' }));
          await fetchConnections();
          
          toast({
            title: "Success",
            description: `${provider} calendar connected successfully`,
          });

          return true;
        } else {
          throw new Error('Token exchange failed');
        }
      }
      
      return false;
    } catch (error: any) {
      setState(prev => ({ ...prev, connectionStatus: 'error', errorMessage: error.message }));
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
    connectGoogleCalendar: handleConnectGoogle,
    connectOutlookCalendar: handleConnectOutlook,
    disconnectProvider,
    syncCalendarEvents: handleSyncCalendarEvents,
    getConnectionByProvider,
    isProviderConnected,
    handleOAuthCallback,
    resetAllConnections,
    refetch: fetchConnections
  };
};
