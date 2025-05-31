
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
      console.log('[CalendarLinking] Checking calendar connection for user:', user.id);
      
      const { data, error } = await supabase
        .from('calendar_connections')
        .select('id, is_active, provider')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .neq('provider_account_id', 'pending');

      if (error && error.code !== 'PGRST116') {
        console.error('[CalendarLinking] Error checking connection:', error);
        setLoading(false);
        return;
      }

      const hasActiveConnection = data && data.length > 0;
      console.log('[CalendarLinking] Active connections found:', hasActiveConnection ? data.length : 0);
      
      setIsConnected(hasActiveConnection);
      setLoading(false);

      // Update setup progress if connected
      if (hasActiveConnection) {
        await supabase
          .from('setup_progress')
          .upsert({
            user_id: user.id,
            calendar_linked: true,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
      }
    } catch (error) {
      console.error('[CalendarLinking] Unexpected error:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      checkCalendarConnection();
    }
  }, [user]);

  return {
    isConnected,
    loading,
    refetchConnection: checkCalendarConnection
  };
};
