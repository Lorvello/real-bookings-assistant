
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
    console.log('Handling calendar OAuth callback:', { code: code.substring(0, 10) + '...', state, provider });

    // Handle Google calendar OAuth callback using our edge function
    if (provider === 'google') {
      const { data, error } = await supabase.functions.invoke('google-calendar-oauth', {
        body: { code, state, user_id: user.id }
      });

      if (error) {
        console.error('Google calendar OAuth error:', error);
        throw error;
      }

      if (data.success) {
        return true;
      } else {
        throw new Error(data.error || 'Google calendar OAuth failed');
      }
    }

    // Handle Microsoft callbacks
    if (provider === 'microsoft') {
      const { data, error } = await supabase.functions.invoke('microsoft-calendar-oauth', {
        body: { code, state, user_id: user.id }
      });

      if (error) {
        console.error('Microsoft calendar OAuth error:', error);
        throw error;
      }

      if (data.success) {
        return true;
      } else {
        throw new Error(data.error || 'Microsoft calendar OAuth failed');
      }
    }

    return false;
  } catch (error: any) {
    console.error('Calendar OAuth callback error:', error);
    throw error;
  }
};
