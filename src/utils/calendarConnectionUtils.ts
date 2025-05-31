
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { CalendarConnection, OAuthProvider } from '@/types/calendar';

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
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching connections:', error);
    throw error;
  }
};

export const getOAuthProvider = async (provider: 'google' | 'microsoft'): Promise<OAuthProvider | null> => {
  try {
    const { data, error } = await supabase
      .from('oauth_providers')
      .select('*')
      .eq('provider', provider)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching OAuth provider:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error fetching OAuth provider:', error);
    return null;
  }
};

export const createPendingConnection = async (user: User, provider: string): Promise<string | null> => {
  try {
    console.log(`[CalendarUtils] Creating pending ${provider} connection for user:`, user.id);
    
    const { data, error } = await supabase
      .from('calendar_connections')
      .insert({
        user_id: user.id,
        provider: provider,
        provider_account_id: 'pending',
        is_active: false
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating pending connection:', error);
      return null;
    }

    console.log(`[CalendarUtils] Created pending connection with ID:`, data.id);
    return data.id;
  } catch (error) {
    console.error('Unexpected error creating pending connection:', error);
    return null;
  }
};

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

    // Set the connection as inactive and clear sensitive data
    const { error: updateError } = await supabase
      .from('calendar_connections')
      .update({ 
        is_active: false,
        access_token: null,
        refresh_token: null,
        expires_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[CalendarUtils] Error disconnecting provider:', updateError);
      return false;
    }

    console.log('[CalendarUtils] Connection successfully marked as inactive and tokens cleared');

    // Check if there are any remaining active connections
    const { data: remainingConnections, error: checkError } = await supabase
      .from('calendar_connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (checkError) {
      console.error('[CalendarUtils] Error checking remaining connections:', checkError);
    } else {
      console.log(`[CalendarUtils] Remaining active connections: ${remainingConnections?.length || 0}`);
      
      if (!remainingConnections || remainingConnections.length === 0) {
        console.log('[CalendarUtils] No more active connections, updating setup progress');
        
        // Update setup progress to reflect no calendar linked
        const { error: progressError } = await supabase
          .from('setup_progress')
          .update({
            calendar_linked: false,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (progressError) {
          console.error('[CalendarUtils] Error updating setup progress:', progressError);
        } else {
          console.log('[CalendarUtils] Setup progress updated - calendar_linked set to false');
        }

        // Also clear any calendar events associated with this user
        const { error: eventsError } = await supabase
          .from('calendar_events')
          .delete()
          .eq('user_id', user.id)
          .eq('calendar_connection_id', connectionId);

        if (eventsError) {
          console.error('[CalendarUtils] Error clearing calendar events:', eventsError);
        } else {
          console.log('[CalendarUtils] Calendar events cleared for disconnected connection');
        }
      }
    }

    console.log('[CalendarUtils] Calendar connection successfully disconnected');
    return true;
  } catch (error) {
    console.error('[CalendarUtils] Unexpected error disconnecting provider:', error);
    return false;
  }
};

// New utility function to disconnect ALL calendar connections for a user
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
      return true; // Nothing to disconnect is considered success
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
