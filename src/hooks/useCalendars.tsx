
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMockDataControl } from '@/hooks/useMockDataControl';
import { Calendar } from '@/types/database';

// Generate consistent mock calendars for testing
const getMockCalendars = (userId: string): Calendar[] => [
  {
    id: '00000000-0000-0000-0000-000000000001',
    user_id: userId,
    name: 'Personal Calendar',
    slug: 'personal-calendar',
    description: 'Your personal appointment calendar',
    timezone: 'Europe/Amsterdam',
    color: '#3B82F6',
    is_active: true,
    is_default: true,
    created_at: new Date().toISOString()
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    user_id: userId,
    name: 'Business Calendar',
    slug: 'business-calendar',
    description: 'Professional appointments and meetings',
    timezone: 'Europe/Amsterdam',
    color: '#10B981',
    is_active: true,
    is_default: false,
    created_at: new Date().toISOString()
  }
];

export const useCalendars = () => {
  const { user } = useAuth();
  const { useMockData } = useMockDataControl();
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      if (useMockData) {
        // Return mock calendars immediately for testing
        setCalendars(getMockCalendars(user.id));
        setLoading(false);
      } else {
        fetchCalendars();
      }
    } else {
      setCalendars([]);
      setLoading(false);
    }
  }, [user, useMockData]);

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

  const refetch = async () => {
    if (useMockData && user) {
      setCalendars(getMockCalendars(user.id));
      return getMockCalendars(user.id);
    } else {
      return fetchCalendars();
    }
  };

  return {
    calendars,
    loading,
    refetch
  };
};
