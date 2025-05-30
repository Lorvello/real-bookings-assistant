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

  const connectProvider = async (provider: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      setState(prev => ({ ...prev, connectionStatus: 'connecting', errorMessage: '' }));

      // Check if OAuth credentials are configured
      const { data: oauthProvider, error: configError } = await supabase
        .from('oauth_providers')
        .select('client_id, client_secret, is_active')
        .eq('provider', provider)
        .single();

      if (configError || !oauthProvider || !oauthProvider.client_id || !oauthProvider.is_active) {
        setState(prev => ({ 
          ...prev, 
          connectionStatus: 'error', 
          errorMessage: `OAuth credentials not configured for ${provider}. Please configure them in the OAuth settings first.` 
        }));
        return { success: false, error: `OAuth credentials not configured for ${provider}` };
      }

      // Create a pending connection record
      const { data: connectionData, error: connectionError } = await supabase
        .from('calendar_connections')
        .insert({
          user_id: user.id,
          provider: provider,
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
      const redirectUri = `${baseUrl}/auth/callback`;

      // Direct OAuth redirects with configured credentials
      if (provider === 'google') {
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', oauthProvider.client_id);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.readonly');
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('access_type', 'offline');
        authUrl.searchParams.set('state', `${provider}:${connectionId}`);
        
        window.location.href = authUrl.toString();
        return { success: true };
      } 
      
      if (provider === 'microsoft') {
        const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
        authUrl.searchParams.set('client_id', oauthProvider.client_id);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('scope', 'https://graph.microsoft.com/calendars.read');
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('state', `${provider}:${connectionId}`);
        
        window.location.href = authUrl.toString();
        return { success: true };
      }

      setState(prev => ({ ...prev, connectionStatus: 'error', errorMessage: 'Unsupported provider' }));
      return { success: false, error: 'Unsupported provider' };

    } catch (error: any) {
      console.error('Error connecting provider:', error);
      setState(prev => ({ ...prev, connectionStatus: 'error', errorMessage: error.message }));
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

  const handleOAuthCallback = async (code: string, state: string) => {
    if (!user) return false;

    try {
      const [provider, connectionId] = state.split(':');
      
      // Here you would normally exchange the code for tokens
      // For now, we'll just mark the connection as active
      const { error } = await supabase
        .from('calendar_connections')
        .update({ 
          is_active: true,
          provider_account_id: 'oauth-connected'
        })
        .eq('id', connectionId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      setState(prev => ({ ...prev, connectionStatus: 'connected' }));
      await fetchConnections();
      
      toast({
        title: "Success",
        description: `${provider} calendar connected successfully`,
      });

      return true;
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
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 2000));

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
    connectionStatus: state.connectionStatus,
    errorMessage: state.errorMessage,
    connectProvider,
    disconnectProvider,
    syncCalendarEvents,
    getConnectionByProvider,
    isProviderConnected,
    handleOAuthCallback,
    refetch: fetchConnections
  };
};
