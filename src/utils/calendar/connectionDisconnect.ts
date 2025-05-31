
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export const disconnectCalendarProvider = async (user: User, connectionId: string): Promise<boolean> => {
  if (!user) {
    console.error('[CalendarDisconnect] No user provided');
    return false;
  }

  try {
    console.log(`[CalendarDisconnect] Starting disconnect for connection: ${connectionId}`);
    
    // Eerst alle calendar events voor deze connection verwijderen
    const { error: eventsError } = await supabase
      .from('calendar_events')
      .delete()
      .eq('calendar_connection_id', connectionId)
      .eq('user_id', user.id);

    if (eventsError) {
      console.error('[CalendarDisconnect] Error clearing calendar events:', eventsError);
      // Continue anyway - events kunnen al weg zijn
    }

    // Dan de connection zelf verwijderen
    const { error: deleteError } = await supabase
      .from('calendar_connections')
      .delete()
      .eq('id', connectionId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('[CalendarDisconnect] Error deleting connection:', deleteError);
      return false;
    }

    console.log('[CalendarDisconnect] Connection successfully deleted');

    // Check of er nog andere actieve connections zijn
    const { data: remainingConnections, error: checkError } = await supabase
      .from('calendar_connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (checkError) {
      console.error('[CalendarDisconnect] Error checking remaining connections:', checkError);
      // Continue anyway
    }

    const hasRemainingConnections = remainingConnections && remainingConnections.length > 0;
    console.log(`[CalendarDisconnect] Remaining connections: ${hasRemainingConnections ? remainingConnections.length : 0}`);

    // Update setup progress als er geen connections meer zijn
    if (!hasRemainingConnections) {
      const { error: progressError } = await supabase
        .from('setup_progress')
        .update({
          calendar_linked: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (progressError) {
        console.error('[CalendarDisconnect] Error updating setup progress:', progressError);
        // Don't fail the disconnect for this
      } else {
        console.log('[CalendarDisconnect] Setup progress updated - calendar_linked set to false');
      }
    }

    return true;
  } catch (error) {
    console.error('[CalendarDisconnect] Unexpected error:', error);
    return false;
  }
};

export const disconnectAllCalendarConnections = async (user: User): Promise<boolean> => {
  if (!user) {
    console.error('[CalendarDisconnect] No user provided for disconnect all');
    return false;
  }

  try {
    console.log(`[CalendarDisconnect] Starting disconnect ALL for user: ${user.id}`);
    
    // Haal alle actieve connections op
    const { data: connections, error: fetchError } = await supabase
      .from('calendar_connections')
      .select('id, provider')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (fetchError) {
      console.error('[CalendarDisconnect] Error fetching connections:', fetchError);
      return false;
    }

    if (!connections || connections.length === 0) {
      console.log('[CalendarDisconnect] No active connections to disconnect');
      
      // Zorg ervoor dat setup progress correct is
      const { error: progressError } = await supabase
        .from('setup_progress')
        .update({
          calendar_linked: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (progressError) {
        console.error('[CalendarDisconnect] Error updating setup progress:', progressError);
      }
      
      return true;
    }

    console.log(`[CalendarDisconnect] Found ${connections.length} connections to disconnect`);

    // Disconnect alle connections één voor één
    let allSuccess = true;
    for (const connection of connections) {
      console.log(`[CalendarDisconnect] Disconnecting ${connection.provider} connection: ${connection.id}`);
      const success = await disconnectCalendarProvider(user, connection.id);
      if (!success) {
        console.error(`[CalendarDisconnect] Failed to disconnect ${connection.provider}: ${connection.id}`);
        allSuccess = false;
      }
    }

    // Force update setup progress ongeacht individuele resultaten
    const { error: finalProgressError } = await supabase
      .from('setup_progress')
      .update({
        calendar_linked: false,
        updated_at = new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (finalProgressError) {
      console.error('[CalendarDisconnect] Error in final setup progress update:', finalProgressError);
    }

    console.log(`[CalendarDisconnect] Disconnect all completed. Success: ${allSuccess}`);
    return allSuccess;
  } catch (error) {
    console.error('[CalendarDisconnect] Unexpected error in disconnect all:', error);
    return false;
  }
};
