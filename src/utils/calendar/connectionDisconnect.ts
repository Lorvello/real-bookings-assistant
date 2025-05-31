
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export const disconnectCalendarProvider = async (user: User, connectionId: string): Promise<boolean> => {
  if (!user) {
    console.error('[CalendarUtils] No user provided for disconnect');
    return false;
  }

  try {
    console.log('[CalendarUtils] Starting disconnect process for connection:', connectionId);
    
    // First verify the connection belongs to the user
    const { data: existingConnection, error: fetchError } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingConnection) {
      console.error('[CalendarUtils] Connection not found or not owned by user:', fetchError);
      return false;
    }

    console.log('[CalendarUtils] Found connection to disconnect:', existingConnection.provider);

    // Delete the connection completely instead of just marking inactive
    const { error: deleteError } = await supabase
      .from('calendar_connections')
      .delete()
      .eq('id', connectionId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('[CalendarUtils] Error deleting connection:', deleteError);
      return false;
    }

    console.log('[CalendarUtils] Connection successfully deleted');

    // Clear any calendar events associated with this connection
    const { error: eventsError } = await supabase
      .from('calendar_events')
      .delete()
      .eq('user_id', user.id)
      .eq('calendar_connection_id', connectionId);

    if (eventsError) {
      console.error('[CalendarUtils] Error clearing calendar events:', eventsError);
    } else {
      console.log('[CalendarUtils] Calendar events cleared for deleted connection');
    }

    return true;
  } catch (error) {
    console.error('[CalendarUtils] Unexpected error disconnecting provider:', error);
    return false;
  }
};

export const disconnectAllCalendarConnections = async (user: User): Promise<boolean> => {
  if (!user) {
    console.error('[CalendarUtils] No user provided for disconnect all');
    return false;
  }

  try {
    console.log('[CalendarUtils] Starting disconnect ALL process for user:', user.id);
    
    // Get all active connections for the user
    const { data: connections, error: fetchError } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (fetchError) {
      console.error('[CalendarUtils] Error fetching connections for disconnect all:', fetchError);
      return false;
    }

    if (!connections || connections.length === 0) {
      console.log('[CalendarUtils] No active connections found to disconnect');
      
      // Still update setup progress to ensure consistency
      const { error: progressError } = await supabase
        .from('setup_progress')
        .update({
          calendar_linked: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (progressError) {
        console.error('[CalendarUtils] Error updating setup progress:', progressError);
      }
      
      return true;
    }

    console.log(`[CalendarUtils] Found ${connections.length} active connections to disconnect`);

    // Disconnect all connections
    let allSuccess = true;
    for (const connection of connections) {
      const success = await disconnectCalendarProvider(user, connection.id);
      if (!success) {
        allSuccess = false;
        console.error(`[CalendarUtils] Failed to disconnect connection: ${connection.id}`);
      }
    }

    // Force update setup progress regardless of individual connection results
    const { error: progressError } = await supabase
      .from('setup_progress')
      .update({
        calendar_linked: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (progressError) {
      console.error('[CalendarUtils] Error updating setup progress after disconnect all:', progressError);
    }

    console.log('[CalendarUtils] Disconnect all process completed, success:', allSuccess);
    return allSuccess;
  } catch (error) {
    console.error('[CalendarUtils] Unexpected error during disconnect all:', error);
    return false;
  }
};
