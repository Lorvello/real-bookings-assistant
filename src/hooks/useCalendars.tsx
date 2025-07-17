
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Calendar } from '@/types/database';

export const useCalendars = () => {
  const { user } = useAuth();
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCalendars();
    } else {
      setCalendars([]);
      setLoading(false);
    }
  }, [user]);

  const fetchCalendars = async () => {
    try {
      setLoading(true);
      console.log('Fetching calendars for user:', user?.id);
      const { data, error } = await supabase
        .from('calendars')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching calendars:', error);
        return [];
      }

      console.log('Calendars fetched successfully:', data);
      setCalendars(data || []);
      return data || [];
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
