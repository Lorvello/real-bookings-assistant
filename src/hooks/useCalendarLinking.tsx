
/**
 * 🔗 CAL.COM CONNECTION STATUS HOOK
 * =================================
 * 
 * 🎯 AFFABLE BOT CONTEXT:
 * Deze hook monitort real-time de Cal.com connection status van gebruikers.
 * Het is cruciaal voor het autonome booking systeem omdat ALLE booking functionaliteit
 * afhankelijk is van actieve Cal.com verbindingen.
 * 
 * 🚀 BUSINESS CRITICAL FUNCTIONS:
 * - Real-time connection status monitoring voor dashboard components
 * - Automatic setup progress updates bij successful connections
 * - Connection validation met filtering van pending/invalid connections
 * - Live status updates zonder page refreshes voor smooth UX
 */

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useCalendarLinking = (user: User | null) => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkCalendarConnection = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('[CalendarLinking] Checking Cal.com connection for user:', user.id);
      
      // Check for active Cal.com connections only
      const { data, error } = await supabase
        .from('calendar_connections')
        .select('id, is_active, provider')
        .eq('user_id', user.id)
        .eq('provider', 'calcom')
        .eq('is_active', true)
        .neq('provider_account_id', 'pending');

      if (error && error.code !== 'PGRST116') {
        console.error('[CalendarLinking] Error checking connection:', error);
        setLoading(false);
        return;
      }

      const hasActiveConnection = data && data.length > 0;
      console.log('[CalendarLinking] Active Cal.com connections found:', hasActiveConnection ? data.length : 0);
      
      setIsConnected(hasActiveConnection);
      setLoading(false);

      // Update setup progress if connection found
      if (hasActiveConnection) {
        try {
          await supabase
            .from('setup_progress')
            .upsert({
              user_id: user.id,
              calendar_linked: true,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id'
            });
          console.log('[CalendarLinking] Setup progress updated - calendar_linked set to true');
        } catch (progressError) {
          console.warn('[CalendarLinking] Failed to update setup progress:', progressError);
        }
      }
    } catch (error) {
      console.error('[CalendarLinking] Unexpected error:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      checkCalendarConnection();
    } else {
      setIsConnected(false);
      setLoading(false);
    }
  }, [user]);

  return {
    isConnected,
    loading,
    refetchConnection: checkCalendarConnection
  };
};
