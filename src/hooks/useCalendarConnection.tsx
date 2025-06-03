
/**
 * 🔗 CALENDAR CONNECTION AUTOMATION HOOK
 * ======================================
 * 
 * 🎯 AFFABLE BOT CONTEXT:
 * This hook manages Cal.com calendar connections for automatic setup.
 * Simplified to only handle Cal.com integration without OAuth complexity.
 */

import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

export const useCalendarConnection = (user: User | null) => {
  const { toast } = useToast();

  const checkCalcomConnection = async () => {
    if (!user) return false;

    try {
      console.log('[CalendarConnection] Checking Cal.com connection for user:', user.id);
      
      // Check for existing Cal.com connection
      const { data: existingConnection } = await supabase
        .from('calendar_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (existingConnection) {
        console.log('[CalendarConnection] Cal.com connection already exists');
        return true;
      }

      console.log('[CalendarConnection] No active Cal.com connection found');
      return false;
    } catch (error) {
      console.error('[CalendarConnection] Error checking Cal.com connection:', error);
      return false;
    }
  };

  // Auto-check on user authentication
  useEffect(() => {
    if (user) {
      checkCalcomConnection();
    }
  }, [user]);

  return { 
    checkCalcomConnection
  };
};
