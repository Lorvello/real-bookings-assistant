
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
    if (!user) return false;

    try {
      console.log('[CalendarManager] Checking connection for user:', user.id);
      
      const { data: connection } = await supabase
        .from('calendar_connections')
        .select('id, is_active')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .eq('is_active', true)
        .neq('access_token', 'pending')
        .maybeSingle();

      const isConnected = !!connection;
      console.log('[CalendarManager] Connection check result:', isConnected);
      
      setState(prev => ({
        ...prev,
        isConnected,
        connectionId: connection?.id || null
      }));

      return isConnected;
    } catch (error) {
      console.error('[CalendarManager] Error checking connection:', error);
      return false;
    }
  }, [user]);

  const createPendingConnection = useCallback(async (): Promise<string | null> => {
    if (!user) return null;

    try {
      console.log('[CalendarManager] Creating pending connection');
      
      // First cleanup any existing pending connections
      await supabase
        .from('calendar_connections')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .eq('access_token', 'pending');

      // Create new pending connection
      const { data, error } = await supabase
        .from('calendar_connections')
        .insert({
          user_id: user.id,
          provider: 'google',
          provider_account_id: 'pending',
          access_token: 'pending'
        })
        .select('id')
        .single();

      if (error) {
        console.error('[CalendarManager] Error creating pending connection:', error);
        return null;
      }

      console.log('[CalendarManager] Created pending connection:', data.id);
      return data.id;
    } catch (error) {
      console.error('[CalendarManager] Unexpected error creating pending connection:', error);
      return null;
    }
  }, [user]);

  const initiateConnection = useCallback(async (): Promise<boolean> => {
    if (!user || state.isConnecting) return false;

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      console.log('[CalendarManager] Starting Google Calendar OAuth');
      
      // Create pending connection to get state parameter
      const connectionId = await createPendingConnection();
      if (!connectionId) {
        setState(prev => ({ 
          ...prev, 
          isConnecting: false, 
          error: 'Failed to create connection record' 
        }));
        return false;
      }

      // Start OAuth flow with dedicated calendar scopes
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            include_granted_scopes: 'false',
            state: connectionId // Use connection ID as state
          }
        }
      });

      if (error) {
        console.error('[CalendarManager] OAuth initiation failed:', error);
        setState(prev => ({ 
          ...prev, 
          isConnecting: false, 
          error: `OAuth error: ${error.message}` 
        }));
        return false;
      }

      console.log('[CalendarManager] OAuth flow initiated successfully');
      return true;
    } catch (error: any) {
      console.error('[CalendarManager] Unexpected error:', error);
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: 'Unexpected error during connection' 
      }));
      return false;
    }
  }, [user, state.isConnecting, createPendingConnection]);

  const resetState = useCallback(() => {
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
      checkConnection();
    } else {
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
