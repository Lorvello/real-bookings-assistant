
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export const syncCalendarEvents = async (user: User): Promise<boolean> => {
  if (!user) return false;

  try {
    const { data, error } = await supabase.functions.invoke('sync-calendar-events', {
      body: { user_id: user.id }
    });

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error syncing events:', error);
    throw error;
  }
};

export const handleOAuthCallback = async (
  code: string, 
  state: string, 
  provider: string, 
  user: User
): Promise<boolean> => {
  if (!user) return false;

  try {
    console.log('Handling OAuth callback:', { code: code.substring(0, 10) + '...', state, provider });

    const { data, error } = await supabase.functions.invoke(`${provider}-calendar-oauth`, {
      body: { code, state, user_id: user.id }
    });

    if (error) {
      console.error('Token exchange error:', error);
      throw error;
    }

    if (data.success) {
      return true;
    } else {
      throw new Error(data.error || 'Token exchange failed');
    }
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    throw error;
  }
};
