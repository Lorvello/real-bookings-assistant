
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
            title: "Sync Failed",
            description: "Failed to sync calendar events. Please try again later.",
            variant: "destructive",
          });
        }
        return false;
      }

      console.log('[CalendarSync] Sync completed successfully:', data);
      setLastSyncTime(new Date());
      
      if (showToast) {
        toast({
          title: "Calendar Synced",
          description: "Your calendar has been synchronized successfully.",
        });
      }
      
      return true;
    } catch (error) {
      console.error('[CalendarSync] Unexpected sync error:', error);
      if (showToast) {
        toast({
          title: "Sync Error",
          description: "An unexpected error occurred during sync.",
          variant: "destructive",
        });
      }
      return false;
    } finally {
      setSyncing(false);
    }
  };

  // Auto-sync on mount for Google users
  useEffect(() => {
    if (user?.app_metadata?.provider === 'google') {
      setTimeout(() => {
        triggerSync(false); // Silent sync on mount
      }, 2000);
    }
  }, [user]);

  return {
    syncing,
    lastSyncTime,
    triggerSync
  };
};
