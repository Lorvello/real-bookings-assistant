
/**
 * ⚡ CAL.COM SYNCHRONIZATION HOOK
 * ==============================
 * 
 * 🎯 AFFABLE BOT CONTEXT:
 * Deze hook orkestreert de synchronisatie met Cal.com bookings.
 * Dit is de ruggengraat van het autonome booking systeem.
 */

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
      console.log('[CalendarSync] Triggering Cal.com sync for user:', user.id);
      
      const { data, error } = await supabase.functions.invoke('sync-calcom-bookings', {
        body: { user_id: user.id }
      });

      if (error) {
        console.error('[CalendarSync] Sync failed:', error);
        
        if (showToast) {
          toast({
            title: "Sync Mislukt",
            description: "Kon Cal.com bookings niet synchroniseren. Probeer het later opnieuw.",
            variant: "destructive",
          });
        }
        return false;
      }

      console.log('[CalendarSync] Sync completed successfully:', data);
      setLastSyncTime(new Date());
      
      if (showToast) {
        const bookingsCount = data?.bookings?.length || 0;
        toast({
          title: "Cal.com Gesynchroniseerd", 
          description: `${bookingsCount} bookings succesvol gesynchroniseerd.`,
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

  useEffect(() => {
    const checkAndSync = async () => {
      if (!user) return;

      try {
        const { data: connections } = await supabase
          .from('calendar_connections')
          .select('id, provider')
          .eq('user_id', user.id)
          .eq('provider', 'calcom')
          .eq('is_active', true)
          .neq('provider_account_id', 'pending');

        if (connections && connections.length > 0) {
          console.log('[CalendarSync] Found active Cal.com connections, triggering auto-sync');
          
          setTimeout(() => {
            triggerSync(false);
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
