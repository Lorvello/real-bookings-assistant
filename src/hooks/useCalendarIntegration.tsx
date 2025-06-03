
/**
 * 🔗 SIMPLIFIED CALENDAR INTEGRATION HOOK
 * =======================================
 * 
 * 🎯 AFFABLE BOT CONTEXT:
 * Simplified hook that only manages Cal.com integration without OAuth complexity.
 */

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { CalendarConnection } from '@/types/calendar';
import { supabase } from '@/integrations/supabase/client';
import { syncCalendarEvents } from '@/utils/calendarSync';

export const useCalendarIntegration = (user: User | null) => {
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      console.log('[useCalendarIntegration] User detected, fetching connections for:', user.id);
      fetchConnections();
    } else {
      console.log('[useCalendarIntegration] No user, clearing state');
      setConnections([]);
      setLoading(false);
    }
  }, [user]);

  const fetchConnections = async () => {
    if (!user) return;

    try {
      console.log('[CalendarIntegration] Starting fetch for user:', user.id);
      setLoading(true);
      
      const { data, error } = await supabase
        .from('calendar_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) {
        console.error('[CalendarIntegration] Error fetching connections:', error);
        toast({
          title: "Error",
          description: "Failed to fetch calendar connections",
          variant: "destructive",
        });
        return;
      }

      console.log('[CalendarIntegration] Fetched connections:', data?.length || 0);
      setConnections(data || []);
    } catch (error) {
      console.error('[CalendarIntegration] Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncCalendarEvents = async (): Promise<boolean> => {
    if (!user) return false;

    setSyncing(true);

    try {
      console.log('[CalendarIntegration] Starting calendar sync');
      
      await syncCalendarEvents(user);
      
      console.log('[CalendarIntegration] Calendar sync completed successfully');
      setSyncing(false);
      return true;
    } catch (error) {
      console.error('[CalendarIntegration] Calendar sync failed:', error);
      setSyncing(false);
      return false;
    }
  };

  const isCalcomConnected = () => {
    return connections.some(conn => conn.is_active);
  };

  const getCalcomConnection = () => {
    return connections.find(conn => conn.is_active);
  };

  return {
    connections,
    loading,
    syncing,
    
    syncCalendarEvents: handleSyncCalendarEvents,
    refetch: fetchConnections,
    
    getCalcomConnection,
    isCalcomConnected,
  };
};
