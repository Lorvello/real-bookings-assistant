
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export const syncCalendarEvents = async (user: User): Promise<boolean> => {
  if (!user) return false;

  try {
    const { data, error } = await supabase.functions.invoke('sync-calcom-bookings', {
      body: { user_id: user.id }
    });

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error syncing Cal.com bookings:', error);
    throw error;
  }
};

export const handleCalcomOAuthCallback = async (
  code: string, 
  state: string, 
  user: User
): Promise<boolean> => {
  if (!user) return false;

  try {
    console.log('Handling Cal.com OAuth callback:', { code: code.substring(0, 10) + '...', state });

    const { data, error } = await supabase.functions.invoke('calcom-oauth', {
      body: { code, state, user_id: user.id }
    });

    if (error) {
      console.error('Cal.com OAuth error:', error);
      throw error;
    }

    if (data.success) {
      return true;
    } else {
      throw new Error(data.error || 'Cal.com OAuth failed');
    }
  } catch (error: any) {
    console.error('Cal.com OAuth callback error:', error);
    throw error;
  }
};
