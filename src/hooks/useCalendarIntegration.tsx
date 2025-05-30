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
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  provider_user_id?: string;
  calendar_id?: string;
}

interface CalendarIntegrationState {
  connections: CalendarConnection[];
  loading: boolean;
  syncing: boolean;
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'error';
  errorMessage: string;
}

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

  const cleanupPendingConnections = async (provider: string) => {
    if (!user) return;

    try {
      // Delete any existing pending connections for this user and provider
      const { error } = await supabase
        .from('calendar_connections')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', provider)
        .eq('provider_account_id', 'pending');

      if (error) {
        console.error('Error cleaning up pending connections:', error);
      } else {
        console.log(`Cleaned up pending ${provider} connections for testing`);
      }
    } catch (error) {
      console.error('Unexpected error cleaning up connections:', error);
    }
  };

  const validateEnvironmentVariables = (provider: 'google' | 'microsoft') => {
    const clientIdVar = provider === 'google' ? 'VITE_GOOGLE_CLIENT_ID' : 'VITE_OUTLOOK_CLIENT_ID';
    const clientId = import.meta.env[clientIdVar];
    
    console.log(`[OAuth Debug] Checking ${clientIdVar}:`, clientId ? 'Present' : 'Missing');

    if (!clientId || clientId.trim() === '') {
      return {
        valid: false,
        error: `Missing ${provider} OAuth configuration. Please set ${clientIdVar} environment variable.`
      };
    }

    return { valid: true };
  };

  const connectGoogleCalendar = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      setState(prev => ({ ...prev, connectionStatus: 'connecting', errorMessage: '' }));

      // Validate environment variables first
      const validation = validateEnvironmentVariables('google');
      if (!validation.valid) {
        setState(prev => ({ ...prev, connectionStatus: 'error', errorMessage: validation.error }));
        toast({
          title: "Configuration Error",
          description: validation.error,
          variant: "destructive",
        });
        return { success: false, error: validation.error };
      }

      // Clean up any existing pending connections
      await cleanupPendingConnections('google');

      // Create a new pending connection record with state parameter
      const { data: connectionData, error: connectionError } = await supabase
        .from('calendar_connections')
        .insert({
          user_id: user.id,
          provider: 'google',
          provider_account_id: 'pending',
          is_active: false
        })
        .select()
        .single();

      if (connectionError) {
        setState(prev => ({ ...prev, connectionStatus: 'error', errorMessage: connectionError.message }));
        return { success: false, error: connectionError.message };
      }

      const connectionId = connectionData.id;
      
      console.log('[OAuth Debug] Using Supabase Auth with state:', connectionId);
      
      // Use Supabase's built-in Google OAuth with scopes for calendar access
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            state: connectionId // Pass connection ID as state
          },
          redirectTo: `${window.location.origin}/auth/google/callback`
        }
      });

      if (error) {
        console.error('Supabase OAuth error:', error);
        setState(prev => ({ ...prev, connectionStatus: 'error', errorMessage: error.message }));
        return { success: false, error: error.message };
      }

      return { success: true };

    } catch (error: any) {
      console.error('Error connecting to Google:', error);
      setState(prev => ({ ...prev, connectionStatus: 'error', errorMessage: error.message }));
      toast({
        title: "Connection Error",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error: error.message };
    }
  };

  const connectOutlookCalendar = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      setState(prev => ({ ...prev, connectionStatus: 'connecting', errorMessage: '' }));

      // Validate environment variables first
      const validation = validateEnvironmentVariables('microsoft');
      if (!validation.valid) {
        setState(prev => ({ ...prev, connectionStatus: 'error', errorMessage: validation.error }));
        toast({
          title: "Configuration Error",
          description: validation.error,
          variant: "destructive",
        });
        return { success: false, error: validation.error };
      }

      // Clean up any existing pending connections for this provider
      await cleanupPendingConnections('microsoft');

      // Create a new pending connection record
      const { data: connectionData, error: connectionError } = await supabase
        .from('calendar_connections')
        .insert({
          user_id: user.id,
          provider: 'microsoft',
          provider_account_id: 'pending',
          is_active: false
        })
        .select()
        .single();

      if (connectionError) {
        setState(prev => ({ ...prev, connectionStatus: 'error', errorMessage: connectionError.message }));
        return { success: false, error: connectionError.message };
      }

      const connectionId = connectionData.id;
      const baseUrl = window.location.origin;
      const redirectUri = `${baseUrl}/auth/outlook/callback`;
      const clientId = import.meta.env.VITE_OUTLOOK_CLIENT_ID;

      // Build Microsoft OAuth URL
      const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('scope', 'https://graph.microsoft.com/calendars.read https://graph.microsoft.com/user.read');
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('response_mode', 'query');
      authUrl.searchParams.set('state', connectionId);
      
      console.log('[OAuth Debug] Constructed Microsoft OAuth URL:', authUrl.toString().replace(clientId, 'CLIENT_ID_HIDDEN'));
      console.log('[OAuth Debug] Redirect URI:', redirectUri);
      
      window.location.href = authUrl.toString();
      return { success: true };

    } catch (error: any) {
      console.error('Error connecting to Outlook:', error);
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

  const resetAllConnections = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      // Delete all connections for this user (both active and pending)
      const { error } = await supabase
        .from('calendar_connections')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error resetting connections:', error);
        toast({
          title: "Error",
          description: "Failed to reset connections",
          variant: "destructive",
        });
        return false;
      }

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

      return true;

    } catch (error) {
      console.error('Unexpected error resetting connections:', error);
      return false;
    }
  };

  const handleOAuthCallback = async (code: string, state: string, provider: string = 'google') => {
    if (!user) return false;

    try {
      console.log('Handling OAuth callback:', { code: code.substring(0, 10) + '...', state, provider });

      // Call the appropriate edge function for token exchange
      const { data, error } = await supabase.functions.invoke(`${provider}-calendar-oauth`, {
        body: { code, state, user_id: user.id }
      });

      if (error) {
        console.error('Token exchange error:', error);
        throw error;
      }

      if (data.success) {
        setState(prev => ({ ...prev, connectionStatus: 'connected' }));
        await fetchConnections();
        
        toast({
          title: "Success",
          description: `${provider} calendar connected successfully`,
        });

        return true;
      } else {
        throw new Error(data.error || 'Token exchange failed');
      }
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      setState(prev => ({ ...prev, connectionStatus: 'error', errorMessage: error.message }));
      return false;
    }
  };

  const syncCalendarEvents = async (): Promise<boolean> => {
    if (!user) return false;

    setState(prev => ({ ...prev, syncing: true }));

    try {
      // Call the sync edge function
      const { data, error } = await supabase.functions.invoke('sync-calendar-events', {
        body: { user_id: user.id }
      });

      if (error) {
        throw error;
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
    connectGoogleCalendar,
    connectOutlookCalendar,
    disconnectProvider,
    syncCalendarEvents,
    getConnectionByProvider,
    isProviderConnected,
    handleOAuthCallback,
    resetAllConnections,
    refetch: fetchConnections
  };
};
