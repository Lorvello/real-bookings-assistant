
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export const updateSetupProgress = async (user: User, step: string, completed: boolean): Promise<boolean> => {
  if (!user) return false;

  try {
    const { error } = await supabase
      .from('setup_progress')
      .update({
        [step]: completed,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating setup progress:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error updating setup progress:', error);
    return false;
  }
};

export const checkCalcomConnectionStatus = async (user: User): Promise<boolean> => {
  if (!user) return false;

  try {
    const { data, error } = await supabase
      .from('calendar_connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error checking Cal.com connection status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Unexpected error checking connection status:', error);
    return false;
  }
};
