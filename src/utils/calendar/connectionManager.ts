
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { CalendarConnection } from '@/types/calendar';

export const fetchCalendarConnections = async (user: User): Promise<CalendarConnection[]> => {
  if (!user) return [];

  try {
    const { data, error } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching calendar connections:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching calendar connections:', error);
    return [];
  }
};

export const createCalcomConnection = async (user: User, calUserId: string): Promise<CalendarConnection | null> => {
  if (!user) return null;

  try {
    // First, deactivate any existing connections
    await supabase
      .from('calendar_connections')
      .update({ is_active: false })
      .eq('user_id', user.id);

    // Create new Cal.com connection
    const { data, error } = await supabase
      .from('calendar_connections')
      .insert({
        user_id: user.id,
        cal_user_id: calUserId,
        is_active: true,
        connected_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating Cal.com connection:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error creating Cal.com connection:', error);
    return null;
  }
};
