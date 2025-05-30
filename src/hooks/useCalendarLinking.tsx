
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
      const { data, error } = await supabase
        .from('calendar_connections')
        .select('id, is_active')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[CalendarLinking] Error checking connection:', error);
        setLoading(false);
        return;
      }

      const connected = !!data;
      setIsConnected(connected);
      setLoading(false);
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
