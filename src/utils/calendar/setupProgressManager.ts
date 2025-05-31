
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export const updateSetupProgress = async (user: User, calendarLinked: boolean): Promise<boolean> => {
  if (!user) {
    console.error('[SetupProgress] No user provided for setup progress update');
    return false;
  }

  try {
    console.log('[SetupProgress] Updating setup progress - calendar_linked:', calendarLinked);
    
    const { error: progressError } = await supabase
      .from('setup_progress')
      .update({
        calendar_linked: calendarLinked,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (progressError) {
      console.error('[SetupProgress] Error updating setup progress:', progressError);
      return false;
    }

    console.log('[SetupProgress] Setup progress updated successfully');
    return true;
  } catch (error) {
    console.error('[SetupProgress] Unexpected error updating setup progress:', error);
    return false;
  }
};

export const checkRemainingConnections = async (user: User): Promise<number> => {
  if (!user) return 0;

  try {
    const { data: remainingConnections, error: checkError } = await supabase
      .from('calendar_connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (checkError) {
      console.error('[CalendarUtils] Error checking remaining connections:', checkError);
      return 0;
    }

    const count = remainingConnections?.length || 0;
    console.log(`[CalendarUtils] Remaining active connections: ${count}`);
    
    return count;
  } catch (error) {
    console.error('[CalendarUtils] Unexpected error checking remaining connections:', error);
    return 0;
  }
};
