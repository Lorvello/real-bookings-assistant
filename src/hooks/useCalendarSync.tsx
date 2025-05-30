
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

export const useCalendarSync = (user: User | null) => {
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const { toast } = useToast();

  const triggerSync = async (showToast = true) => {
    if (!user || syncing) return false;

    setSyncing(true);
    try {
      console.log('[CalendarSync] Triggering calendar sync for user:', user.id);
      
      const { data, error } = await supabase.functions.invoke('sync-calendar-events', {
        body: { user_id: user.id }
      });

      if (error) {
        console.error('[CalendarSync] Sync failed:', error);
        if (showToast) {
          toast({
            title: "Sync Mislukt",
            description: "Kon agenda events niet synchroniseren. Probeer het later opnieuw.",
            variant: "destructive",
          });
        }
        return false;
      }

      console.log('[CalendarSync] Sync completed successfully:', data);
      setLastSyncTime(new Date());
      
      if (showToast) {
        const eventsCount = data?.syncResults?.reduce((total: number, result: any) => total + result.events_synced, 0) || 0;
        toast({
          title: "Agenda Gesynchroniseerd",
          description: `${eventsCount} events succesvol gesynchroniseerd.`,
        });
      }
      
      return true;
    } catch (error) {
      console.error('[CalendarSync] Unexpected sync error:', error);
      if (showToast) {
        toast({
          title: "Sync Fout",
          description: "Er ging iets mis tijdens synchronisatie.",
          variant: "destructive",
        });
      }
      return false;
    } finally {
      setSyncing(false);
    }
  };

  // Auto-sync on mount for users with Google connections
  useEffect(() => {
    const checkAndSync = async () => {
      if (!user) return;

      try {
        // Check if user has active calendar connections
        const { data: connections } = await supabase
          .from('calendar_connections')
          .select('id, provider')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .neq('provider_account_id', 'pending');

        if (connections && connections.length > 0) {
          console.log('[CalendarSync] Found active connections, triggering auto-sync');
          setTimeout(() => {
            triggerSync(false); // Silent sync on mount
          }, 2000);
        }
      } catch (error) {
        console.error('[CalendarSync] Error checking connections:', error);
      }
    };

    checkAndSync();
  }, [user]);

  return {
    syncing,
    lastSyncTime,
    triggerSync
  };
};
