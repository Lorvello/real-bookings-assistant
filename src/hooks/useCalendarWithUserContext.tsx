
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Calendar } from '@/types/database';

interface CalendarWithUser extends Calendar {
  user?: {
    id: string;
    email: string;
    full_name?: string;
    business_name?: string;
  };
}

export const useCalendarWithUserContext = () => {
  const { user } = useAuth();
  const [calendarsWithUsers, setCalendarsWithUsers] = useState<CalendarWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCalendarsWithUserContext();
    } else {
      setCalendarsWithUsers([]);
      setLoading(false);
    }
  }, [user]);

  const fetchCalendarsWithUserContext = async () => {
    try {
      // Join calendars with users table to get user context
      const { data, error } = await supabase
        .from('calendars')
        .select(`
          *,
          users:user_id (
            id,
            email,
            full_name,
            business_name
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching calendars with user context:', error);
        return;
      }

      // Transform the data to include user context
      const calendarsWithContext = data?.map(calendar => ({
        ...calendar,
        user: calendar.users
      })) || [];

      setCalendarsWithUsers(calendarsWithContext);
    } catch (error) {
      console.error('Error fetching calendars with user context:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    calendarsWithUsers,
    loading,
    refetch: fetchCalendarsWithUserContext
  };
};
