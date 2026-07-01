
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Calendar } from '@/types/database';

export const useCalendars = () => {
  const { user, loading: authLoading } = useAuth();
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  // Keep loading TRUE until auth has resolved AND (if a user exists) the first
  // calendar fetch has completed. Reporting loading=false while auth is still
  // resolving would let consumers read an empty calendars[] as "genuinely empty"
  // and flash an empty CTA before the real data arrives (RUX-2).
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      // Auth not resolved yet; calendars are indeterminate, stay loading.
      setLoading(true);
      return;
    }
    if (user) {
      fetchCalendars();
    } else {
      // Auth resolved, no user: there are genuinely no calendars to load.
      setCalendars([]);
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchCalendars = async () => {
    try {
      setLoading(true);
      console.log('Fetching calendars for user:', user?.id);
      
      // Query 1: Calendars owned by user
      const { data: ownedCalendars, error: ownedError } = await supabase
        .from('calendars')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: true });

      if (ownedError) {
        console.error('Error fetching owned calendars:', ownedError);
      }

      // Query 2: Calendars where user is a team member
      const { data: membershipData, error: memberError } = await supabase
        .from('calendar_members')
        .select(`
          calendar_id,
          role,
          calendars (*)
        `)
        .eq('user_id', user?.id);

      if (memberError) {
        console.error('Error fetching member calendars:', memberError);
      }

      // Extract calendars from memberships
      const memberCalendars = membershipData
        ?.map(m => m.calendars)
        .filter(Boolean) || [];

      // Combine and deduplicate by ID
      const allCalendarsMap = new Map();
      [...(ownedCalendars || []), ...memberCalendars].forEach(cal => {
        if (cal && !allCalendarsMap.has(cal.id)) {
          allCalendarsMap.set(cal.id, cal);
        }
      });

      const uniqueCalendars = Array.from(allCalendarsMap.values());
      
      console.log('Calendars fetched:', {
        owned: ownedCalendars?.length || 0,
        member: memberCalendars.length,
        total: uniqueCalendars.length
      });
      
      setCalendars(uniqueCalendars);
      return uniqueCalendars;
    } catch (error) {
      console.error('Error fetching calendars:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    calendars,
    loading,
    refetch: fetchCalendars
  };
};
