
/**
 * ⚡ CALENDAR SYNCHRONIZATION HOOK
 * ===============================
 * 
 * 🎯 AFFABLE BOT CONTEXT:
 * Deze hook orkestreert de real-time synchronisatie tussen externe kalenders (Google, Microsoft)
 * en de lokale calendar_events cache. Dit is de ruggengraat van het autonome booking systeem
 * omdat de WhatsApp bot afhankelijk is van accurate, up-to-date beschikbaarheidsdata.
 * 
 * 🚀 BUSINESS CRITICAL FUNCTIONS:
 * - Manual sync triggering voor immediate availability updates
 * - Automatic sync op component mount voor fresh data guarantee
 * - Sync status tracking voor loading indicators en user feedback
 * - Error handling met user notifications voor troubleshooting
 * 
 * 🎪 SYSTEM INTEGRATION POINTS:
 * - Dashboard refresh buttons: Manual sync voor immediate updates
 * - Post-connection setup: Initial sync na successful OAuth
 * - WhatsApp bot dependency: Bot gebruikt gesynchroniseerde calendar_events
 * - Business metrics: Sync failures kunnen booking volume beïnvloeden
 * 
 * 💡 SUCCESS METRICS CONTRIBUTION:
 * - Fast sync times (< 30 sec) verbeteren user experience
 * - Reliable sync voorkomt dubbele boekingen en customer frustration
 * - Auto-sync zorgt voor always-fresh data zonder user intervention
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

/**
 * 🎮 Primary hook voor calendar synchronization management
 * 
 * RESPONSIBILITIES:
 * - Manual sync triggering via Supabase Edge Functions
 * - Sync status tracking met loading indicators
 * - Auto-sync voor users met actieve connections
 * - Error handling met user-friendly notifications
 * - Success feedback met sync statistics
 * 
 * @param user - Authenticated user object voor RLS en Edge Function calls
 * @returns Object met sync status, actions en utility data
 */
export const useCalendarSync = (user: User | null) => {
  // 📊 STATE MANAGEMENT
  const [syncing, setSyncing] = useState(false);         // Active sync in progress
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null); // Last successful sync
  const { toast } = useToast();

  /**
   * 🚀 Triggers calendar synchronization via Supabase Edge Function
   * 
   * SYNC WORKFLOW:
   * 1. Call sync-calendar-events Edge Function met user_id
   * 2. Edge Function processes alle actieve calendar connections
   * 3. External calendar APIs worden gecalled voor latest events
   * 4. Local calendar_events tabel wordt updated met fresh data
   * 5. Success metrics en user feedback worden provided
   * 
   * ERROR HANDLING:
   * - Edge Function errors: Network issues, API rate limits, auth failures
   * - User feedback: Toast notifications met actionable messages
   * - Graceful degradation: System blijft functional bij sync failures
   * 
   * @param showToast - Optional boolean om user notifications te controleren
   * @returns Promise<boolean> - Success status voor calling components
   */
  const triggerSync = async (showToast = true) => {
    if (!user || syncing) return false;

    setSyncing(true);
    try {
      console.log('[CalendarSync] Triggering calendar sync for user:', user.id);
      
      // 🌐 Call Supabase Edge Function voor sync orchestration
      const { data, error } = await supabase.functions.invoke('sync-calendar-events', {
        body: { user_id: user.id }
      });

      if (error) {
        console.error('[CalendarSync] Sync failed:', error);
        
        if (showToast) {
          // 🚨 User feedback voor sync failures
          toast({
            title: "Sync Mislukt",
            description: "Kon agenda events niet synchroniseren. Probeer het later opnieuw.",
            variant: "destructive",
          });
        }
        return false;
      }

      // ✅ SUCCESS PROCESSING
      console.log('[CalendarSync] Sync completed successfully:', data);
      setLastSyncTime(new Date());
      
      if (showToast) {
        // 📊 Calculate en toon sync statistics
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
        // 🚨 Generic error feedback
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

  // 🔄 EFFECT: Auto-sync on mount voor users met active connections
  // Zorgt ervoor dat fresh data beschikbaar is zonder user intervention
  useEffect(() => {
    /**
     * 🤖 Checks en triggert automatic sync voor eligible users
     * 
     * AUTO-SYNC CRITERIA:
     * - User must be authenticated
     * - User must have actieve calendar connections
     * - Connections must not be in pending state
     * - Silent execution (geen toast notifications)
     * 
     * TIMING:
     * - 2 second delay na component mount voor smooth UX
     * - Prevents flooding van sync requests bij rapid navigation
     */
    const checkAndSync = async () => {
      if (!user) return;

      try {
        // 🔍 Check voor actieve calendar connections
        const { data: connections } = await supabase
          .from('calendar_connections')
          .select('id, provider')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .neq('provider_account_id', 'pending');

        if (connections && connections.length > 0) {
          console.log('[CalendarSync] Found active connections, triggering auto-sync');
          
          // ⏱️ Delayed execution voor better user experience
          setTimeout(() => {
            triggerSync(false); // Silent sync zonder toast notifications
          }, 2000);
        }
      } catch (error) {
        console.error('[CalendarSync] Error checking connections:', error);
        // Don't show user error voor auto-sync failures
      }
    };

    checkAndSync();
  }, [user]); // Re-run wanneer user changes (login/logout)

  // 🎯 HOOK RETURN INTERFACE
  return {
    syncing,        // Boolean: true tijdens active sync operation
    lastSyncTime,   // Date: timestamp van laatste successful sync
    triggerSync     // Function: manual sync trigger met optional toast feedback
  };
};

/**
 * 🎯 AFFABLE BOT SYSTEM NOTES:
 * ============================
 * 
 * Deze hook is essentieel voor het onderhouden van accurate calendar data die het hart vormt
 * van het autonome booking systeem. Zonder reliable synchronisatie kan de WhatsApp bot geen
 * accurate beschikbaarheid bepalen, wat leidt tot dubbele boekingen en customer frustration.
 * 
 * KEY BUSINESS DEPENDENCIES:
 * - WhatsApp Bot: Gebruikt calendar_events voor realtime availability checking
 * - Dashboard: Sync status indicators en manual refresh functionaliteit
 * - Booking Logic: Accurate event data voorkomt scheduling conflicts
 * - Business Metrics: Sync failures kunnen appointment volume metrics beïnvloeden
 * 
 * CRITICAL SUCCESS FACTORS:
 * - Fast sync execution (< 30 sec) voor immediate data freshness
 * - Reliable error handling om system stability te waarborgen
 * - Silent auto-sync voor seamless background updates
 * - Clear user feedback bij manual sync operations
 * 
 * SYNC ORCHESTRATION FLOW:
 * 1. Frontend triggert sync via deze hook
 * 2. Supabase Edge Function verwerkt alle actieve connections
 * 3. External APIs (Google/Microsoft) worden parallel bevraagd
 * 4. Event data wordt processed en opgeslagen in calendar_events
 * 5. Duplicate detection en conflict resolution worden uitgevoerd
 * 6. Success metrics worden returned voor user feedback
 * 
 * BUSINESS VALUE DELIVERY:
 * - Prevents double bookings door realtime availability updates
 * - Enables 24/7 autonomous booking zonder manual intervention
 * - Reduces customer frustration door accurate time slot offerings
 * - Supports multi-provider calendar integration voor comprehensive coverage
 */
