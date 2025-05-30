
import { useState, useCallback } from 'react';
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
      const { data: connection } = await supabase
        .from('calendar_connections')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .eq('is_active', true)
        .maybeSingle();

      const isConnected = !!connection;
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

  const initiateConnection = useCallback(async (): Promise<boolean> => {
    if (!user || state.isConnecting) return false;

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      console.log('[CalendarManager] Starting dedicated calendar connection');
      
      // Use dedicated calendar OAuth with forced consent
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            include_granted_scopes: 'false'
          }
        }
      });

      if (error) {
        console.error('[CalendarManager] OAuth error:', error);
        setState(prev => ({ 
          ...prev, 
          isConnecting: false, 
          error: `Verbindingsfout: ${error.message}` 
        }));
        
        toast({
          title: "Kalenderkoppeling Mislukt",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      return true;
    } catch (error: any) {
      console.error('[CalendarManager] Unexpected error:', error);
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: 'Onverwachte fout bij kalenderkoppeling' 
      }));
      
      toast({
        title: "Fout",
        description: "Er ging iets mis. Probeer het opnieuw.",
        variant: "destructive",
      });
      return false;
    }
  }, [user, state.isConnecting, toast]);

  const resetState = useCallback(() => {
    setState({
      isConnecting: false,
      isConnected: false,
      connectionId: null,
      error: null
    });
  }, []);

  return {
    ...state,
    checkConnection,
    initiateConnection,
    resetState
  };
};
