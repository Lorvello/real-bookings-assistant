
/**
 * 🔗 CALENDAR LINKING STATUS HOOK
 * ===============================
 * 
 * 🎯 AFFABLE BOT CONTEXT:
 * Deze hook monitort real-time de calendar connection status van gebruikers.
 * Het is cruciaal voor het autonome booking systeem omdat ALLE booking functionaliteit
 * afhankelijk is van actieve calendar verbindingen voor beschikbaarheidscontrole.
 * 
 * 🚀 BUSINESS CRITICAL FUNCTIONS:
 * - Real-time connection status monitoring voor dashboard components
 * - Automatic setup progress updates bij successful connections
 * - Connection validation met filtering van pending/invalid connections
 * - Live status updates zonder page refreshes voor smooth UX
 * 
 * 🎪 SYSTEM INTEGRATION POINTS:
 * - Dashboard widgets: Tonen connection status en action items
 * - Setup progress: Automatic completion tracking van calendar step
 * - WhatsApp bot: Kan alleen functioneren met actieve connections
 * - Calendar sync: Monitort welke connections beschikbaar zijn voor sync
 * 
 * 💡 SUCCESS METRICS CONTRIBUTION:
 * - Fast connection detection (< 5 sec) voor immediate user feedback
 * - Accurate status reporting voorkomt user confusion en support tickets
 * - Automatic progress updates verbeteren completion rates
 */

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/**
 * 🎮 Primary hook voor calendar connection status monitoring
 * 
 * RESPONSIBILITIES:
 * - Real-time connection status checking via database queries
 * - Filtering van alleen actieve, valid connections (exclude pending)
 * - Automatic setup progress updates bij successful connections
 * - Graceful error handling voor API failures
 * - Loading state management voor smooth UX
 * 
 * @param user - Authenticated user object voor RLS en database access
 * @returns Object met connection status, loading state en refresh function
 */
export const useCalendarLinking = (user: User | null) => {
  // 📊 STATE MANAGEMENT
  const [isConnected, setIsConnected] = useState(false); // Primary connection status
  const [loading, setLoading] = useState(true);          // Initial loading indicator

  /**
   * 🔍 Checks database voor active calendar connections
   * 
   * VALIDATION LOGIC:
   * - Only count actieve connections (is_active = true)
   * - Exclude pending connections (provider_account_id != 'pending')
   * - Handle RLS errors gracefully (PGRST116 = no data found)
   * - Update setup progress automatically bij successful connections
   * 
   * DATABASE QUERY OPTIMIZATION:
   * - Select minimal fields (id, is_active, provider) voor performance  
   * - Use compound filters voor efficient index usage
   * - Early return voor unauthenticated users
   * 
   * BUSINESS RULES:
   * - User must be authenticated (RLS requirement)
   * - Connection must be active én fully configured
   * - Multiple providers kunnen simultaneously connected zijn
   */
  const checkCalendarConnection = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('[CalendarLinking] Checking calendar connection for user:', user.id);
      
      // 🔍 Query database voor actieve, valid connections
      const { data, error } = await supabase
        .from('calendar_connections')
        .select('id, is_active, provider')
        .eq('user_id', user.id)          // RLS filter voor user security
        .eq('is_active', true)           // Only active connections
        .neq('provider_account_id', 'pending'); // Exclude incomplete OAuth flows

      // 🚨 ERROR HANDLING
      // PGRST116 = no data found (normal case voor nieuwe users)
      if (error && error.code !== 'PGRST116') {
        console.error('[CalendarLinking] Error checking connection:', error);
        setLoading(false);
        return;
      }

      // ✅ CONNECTION STATUS EVALUATION
      const hasActiveConnection = data && data.length > 0;
      console.log('[CalendarLinking] Active connections found:', hasActiveConnection ? data.length : 0);
      
      // 📊 Update local state
      setIsConnected(hasActiveConnection);
      setLoading(false);

      // 🎯 AUTOMATIC SETUP PROGRESS UPDATE
      // Als connection gevonden, mark calendar_linked als completed
      if (hasActiveConnection) {
        try {
          await supabase
            .from('setup_progress')
            .upsert({
              user_id: user.id,
              calendar_linked: true,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id'  // Update existing record of insert new
            });
          console.log('[CalendarLinking] Setup progress updated - calendar_linked set to true');
        } catch (progressError) {
          // 🔄 Don't fail main function for setup progress errors
          console.warn('[CalendarLinking] Failed to update setup progress:', progressError);
        }
      }
    } catch (error) {
      // 🚨 UNEXPECTED ERROR HANDLING
      console.error('[CalendarLinking] Unexpected error:', error);
      setLoading(false);
    }
  };

  // 🔄 EFFECT: Auto-check connection status on user change
  // Triggert bij login, logout, of component mount
  useEffect(() => {
    if (user) {
      checkCalendarConnection();
    } else {
      // 🔒 Clear state bij logout voor security
      setIsConnected(false);
      setLoading(false);
    }
  }, [user]);

  // 🎯 HOOK RETURN INTERFACE
  return {
    isConnected,              // Boolean: true als user heeft actieve calendar verbinding
    loading,                  // Boolean: true tijdens initial data fetch
    refetchConnection: checkCalendarConnection  // Function: manual refresh trigger
  };
};

/**
 * 🎯 AFFABLE BOT SYSTEM NOTES:
 * ============================
 * 
 * Deze hook is fundamenteel voor de werking van het autonome booking systeem.
 * Zonder actieve calendar connections kan de WhatsApp bot geen beschikbaarheid controleren,
 * waardoor alle booking functionaliteit uitgeschakeld wordt.
 * 
 * KEY BUSINESS DEPENDENCIES:
 * - Dashboard: Setup progress cards tonen connection status
 * - WhatsApp Bot: Vereist actieve connections voor availability checking  
 * - Calendar Sync: Gebruikt connection status voor sync orchestration
 * - User Onboarding: Connection status bepaalt completion van setup flow
 * 
 * CRITICAL SUCCESS FACTORS:
 * - Fast response times (< 3 sec) voor immediate user feedback
 * - Accurate status detection om false positives/negatives te voorkomen
 * - Reliable error handling om user experience niet te verstoren
 * - Automatic progress tracking voor seamless onboarding
 * 
 * DATA CONSISTENCY REQUIREMENTS:
 * - calendar_connections.is_active moet accurate system status reflecteren
 * - setup_progress.calendar_linked moet sync zijn met actual connections
 * - Pending OAuth states mogen niet als "connected" worden gerapporteerd
 * - Multiple providers moeten correctly worden geaggregeerd
 * 
 * INTEGRATION PATTERNS:
 * - Real-time updates: Components kunnen deze hook gebruiken voor live status
 * - Conditional rendering: UI elements kunnen tonen/verbergen based op connection status  
 * - Error boundaries: Failed connections moeten graceful degradation triggeren
 * - Progress tracking: Setup wizards kunnen automatic advancement implementeren
 */
