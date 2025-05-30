
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

  const cleanupPendingConnections = useCallback(async () => {
    if (!user) return;

    try {
      await supabase
        .from('calendar_connections')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .eq('provider_account_id', 'pending');
    } catch (error) {
      console.error('[CalendarManager] Error cleaning up:', error);
    }
  }, [user]);

  const initiateConnection = useCallback(async (): Promise<void> => {
    if (!user || state.isConnecting) return;

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      console.log('[CalendarManager] Starting calendar connection flow');
      
      // Cleanup any existing pending connections
      await cleanupPendingConnections();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?calendar=true`,
          scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            include_granted_scopes: 'true'
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
      }
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
    }
  }, [user, state.isConnecting, cleanupPendingConnections, toast]);

  const waitForConnection = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    let retries = 0;
    const maxRetries = 15;
    const retryDelay = 2000;

    while (retries < maxRetries) {
      const isConnected = await checkConnection();
      
      if (isConnected) {
        setState(prev => ({ ...prev, isConnecting: false }));
        toast({
          title: "Kalender Verbonden",
          description: "Google Calendar is succesvol gekoppeld!",
        });
        return true;
      }

      retries++;
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    setState(prev => ({ 
      ...prev, 
      isConnecting: false, 
      error: 'Verbinding kon niet worden voltooid na meerdere pogingen' 
    }));
    
    toast({
      title: "Verbinding Mislukt",
      description: "Kon geen verbinding maken met Google Calendar.",
      variant: "destructive",
    });
    
    return false;
  }, [user, checkConnection, toast]);

  return {
    ...state,
    checkConnection,
    initiateConnection,
    waitForConnection,
    cleanupPendingConnections
  };
};
