
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export const disconnectCalcomProvider = async (user: User, connectionId: string): Promise<boolean> => {
  if (!user) return false;

  try {
    console.log('[DisconnectCalcom] Disconnecting Cal.com connection:', connectionId);

    // Mark connection as inactive
    const { error: updateError } = await supabase
      .from('calendar_connections')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[DisconnectCalcom] Failed to deactivate connection:', updateError);
      return false;
    }

    // Remove associated calendar events
    const { error: eventsError } = await supabase
      .from('calendar_events')
      .delete()
      .eq('user_id', user.id);

    if (eventsError) {
      console.error('[DisconnectCalcom] Failed to remove events:', eventsError);
      // Don't return false here as connection is already deactivated
    }

    console.log('[DisconnectCalcom] Successfully disconnected Cal.com');
    return true;

  } catch (error) {
    console.error('[DisconnectCalcom] Unexpected disconnect error:', error);
    return false;
  }
};
