
import { useState, useCallback, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CalendarConnectionState {
  isConnecting: boolean;
  isConnected: boolean;
  connectionId: string | null;
  error: string | null;
}

export const useCalendarConnectionManager = (user: User | null) => {
  const [state, setState] = useState<CalendarConnectionState>({
    isConnecting: false,
    isConnected: false,
    connectionId: null,
    error: null
  });
  const { toast } = useToast();

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (!user) {
      console.log('[CalendarManager] No user, returning false');
      return false;
    }

    try {
      console.log('[CalendarManager] Checking connection for user:', user.id);
      
      const { data: connection, error } = await supabase
        .from('calendar_connections')
        .select('id, is_active, access_token, provider')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .eq('is_active', true)
        .neq('access_token', 'pending')
        .maybeSingle();

      if (error) {
        console.error('[CalendarManager] Error checking connection:', error);
        setState(prev => ({ ...prev, error: error.message }));
        return false;
      }

      const isConnected = !!connection && connection.access_token !== 'pending';
      console.log('[CalendarManager] Connection check result:', { isConnected, connection });
      
      setState(prev => ({
        ...prev,
        isConnected,
        connectionId: connection?.id || null,
        error: null
      }));

      return isConnected;
    } catch (error) {
      console.error('[CalendarManager] Unexpected error checking connection:', error);
      setState(prev => ({ ...prev, error: 'Fout bij het controleren van verbinding' }));
      return false;
    }
  }, [user]);

  const createPendingConnection = useCallback(async (): Promise<string | null> => {
    if (!user) {
      console.log('[CalendarManager] No user for creating pending connection');
      return null;
    }

    try {
      console.log('[CalendarManager] Creating pending connection for user:', user.id);
      
      // First cleanup any existing pending connections
      const { error: deleteError } = await supabase
        .from('calendar_connections')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .eq('access_token', 'pending');

      if (deleteError) {
        console.error('[CalendarManager] Error cleaning up pending connections:', deleteError);
      }

      // Create new pending connection
      const { data, error } = await supabase
        .from('calendar_connections')
        .insert({
          user_id: user.id,
          provider: 'google',
          provider_account_id: 'pending',
          access_token: 'pending',
          is_active: false
        })
        .select('id')
        .single();

      if (error) {
        console.error('[CalendarManager] Error creating pending connection:', error);
        setState(prev => ({ ...prev, error: `Database fout: ${error.message}` }));
        return null;
      }

      console.log('[CalendarManager] Created pending connection:', data.id);
      return data.id;
    } catch (error) {
      console.error('[CalendarManager] Unexpected error creating pending connection:', error);
      setState(prev => ({ ...prev, error: 'Onverwachte fout bij aanmaken verbinding' }));
      return null;
    }
  }, [user]);

  const initiateConnection = useCallback(async (): Promise<boolean> => {
    if (!user || state.isConnecting) {
      console.log('[CalendarManager] Cannot initiate connection:', { user: !!user, isConnecting: state.isConnecting });
      return false;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      console.log('[CalendarManager] Starting Google Calendar OAuth for user:', user.id);
      
      // Create pending connection to get state parameter
      const connectionId = await createPendingConnection();
      if (!connectionId) {
        setState(prev => ({ 
          ...prev, 
          isConnecting: false, 
          error: 'Kon verbinding niet aanmaken in database' 
        }));
        return false;
      }

      console.log('[CalendarManager] Starting OAuth with connection ID:', connectionId);

      // Start OAuth flow with calendar-specific redirect
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?type=calendar`,
          scopes: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            include_granted_scopes: 'false',
            state: connectionId
          }
        }
      });

      if (error) {
        console.error('[CalendarManager] OAuth initiation failed:', error);
        setState(prev => ({ 
          ...prev, 
          isConnecting: false, 
          error: `OAuth fout: ${error.message}` 
        }));
        return false;
      }

      console.log('[CalendarManager] OAuth flow initiated successfully');
      return true;
    } catch (error: any) {
      console.error('[CalendarManager] Unexpected error during OAuth:', error);
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: 'Onverwachte fout tijdens verbinding' 
      }));
      return false;
    }
  }, [user, state.isConnecting, createPendingConnection]);

  const resetState = useCallback(() => {
    console.log('[CalendarManager] Resetting state');
    setState({
      isConnecting: false,
      isConnected: false,
      connectionId: null,
      error: null
    });
  }, []);

  // Check connection status on mount and user change
  useEffect(() => {
    if (user) {
      console.log('[CalendarManager] User changed, checking connection');
      checkConnection();
    } else {
      console.log('[CalendarManager] No user, resetting state');
      resetState();
    }
  }, [user, checkConnection, resetState]);

  return {
    ...state,
    checkConnection,
    initiateConnection,
    resetState
  };
};
