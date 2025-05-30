
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

  const connectGoogleCalendar = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      setState(prev => ({ ...prev, connectionStatus: 'connecting', errorMessage: '' }));

      // Check if environment variables are set
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!googleClientId) {
        setState(prev => ({ 
          ...prev, 
          connectionStatus: 'error', 
          errorMessage: 'Google OAuth not configured. Please set VITE_GOOGLE_CLIENT_ID environment variable.' 
        }));
        return { success: false, error: 'Google OAuth not configured' };
      }

      // Create a pending connection record
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
      const redirectUri = `${window.location.origin}/auth/google/callback`;

      // Build Google OAuth URL
      const googleAuthUrl = new URL('https://accounts.google.com/oauth/authorize');
      googleAuthUrl.searchParams.set('client_id', googleClientId);
      googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
      googleAuthUrl.searchParams.set('response_type', 'code');
      googleAuthUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email');
      googleAuthUrl.searchParams.set('access_type', 'offline');
      googleAuthUrl.searchParams.set('prompt', 'consent');
      googleAuthUrl.searchParams.set('state', connectionId);
      
      // Redirect to Google OAuth
      window.location.href = googleAuthUrl.toString();
      return { success: true };

    } catch (error: any) {
      console.error('Error connecting Google Calendar:', error);
      setState(prev => ({ ...prev, connectionStatus: 'error', errorMessage: error.message }));
      return { success: false, error: error.message };
    }
  };

  const connectOutlookCalendar = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      setState(prev => ({ ...prev, connectionStatus: 'connecting', errorMessage: '' }));

      // Check if environment variables are set
      const outlookClientId = import.meta.env.VITE_OUTLOOK_CLIENT_ID;
      if (!outlookClientId) {
        setState(prev => ({ 
          ...prev, 
          connectionStatus: 'error', 
          errorMessage: 'Outlook OAuth not configured. Please set VITE_OUTLOOK_CLIENT_ID environment variable.' 
        }));
        return { success: false, error: 'Outlook OAuth not configured' };
      }

      // Create a pending connection record
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
      const redirectUri = `${window.location.origin}/auth/outlook/callback`;

      // Build Microsoft OAuth URL
      const microsoftAuthUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
      microsoftAuthUrl.searchParams.set('client_id', outlookClientId);
      microsoftAuthUrl.searchParams.set('redirect_uri', redirectUri);
      microsoftAuthUrl.searchParams.set('response_type', 'code');
      microsoftAuthUrl.searchParams.set('scope', 'https://graph.microsoft.com/calendars.read https://graph.microsoft.com/user.read');
      microsoftAuthUrl.searchParams.set('response_mode', 'query');
      microsoftAuthUrl.searchParams.set('state', connectionId);
      
      // Redirect to Microsoft OAuth
      window.location.href = microsoftAuthUrl.toString();
      return { success: true };

    } catch (error: any) {
      console.error('Error connecting Outlook Calendar:', error);
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

    } catch (error: any) {
      console.error('Error syncing calendar events:', error);
      toast({
        title: "Error",
        description: "Failed to sync calendar events",
        variant: "destructive",
      });
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
    connectGoogleCalendar,
    connectOutlookCalendar,
    disconnectProvider,
    syncCalendarEvents,
    getConnectionByProvider,
    isProviderConnected,
    refetch: fetchConnections
  };
};
