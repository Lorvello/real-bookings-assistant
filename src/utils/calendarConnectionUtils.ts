
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

export const cleanupPendingConnections = async (user: User, provider: string) => {
  if (!user) return;

  try {
    console.log(`[CalendarUtils] Cleaning up pending ${provider} connections for user:`, user.id);
    
    const { error } = await supabase
      .from('calendar_connections')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', provider)
      .eq('provider_account_id', 'pending');

    if (error) {
      console.error('Error cleaning up pending connections:', error);
    } else {
      console.log(`[CalendarUtils] Successfully cleaned up pending ${provider} connections`);
    }
  } catch (error) {
    console.error('Unexpected error cleaning up connections:', error);
  }
};

export const cleanupExpiredConnections = async (user: User) => {
  if (!user) return;

  try {
    console.log(`[CalendarUtils] Cleaning up expired connections for user:`, user.id);
    
    // Get current time minus 1 hour (connections older than 1 hour without proper setup)
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    const { error } = await supabase
      .from('calendar_connections')
      .delete()
      .eq('user_id', user.id)
      .eq('provider_account_id', 'pending')
      .lt('created_at', oneHourAgo.toISOString());

    if (error) {
      console.error('Error cleaning up expired connections:', error);
    } else {
      console.log(`[CalendarUtils] Successfully cleaned up expired connections`);
    }
  } catch (error) {
    console.error('Unexpected error cleaning up expired connections:', error);
  }
};

export const getOAuthProvider = async (provider: 'google' | 'microsoft'): Promise<OAuthProvider | null> => {
  try {
    const { data, error } = await supabase
      .from('oauth_providers')
      .select('id, provider, client_id, is_active')
      .eq('provider', provider)
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

export const disconnectCalendarProvider = async (user: User, connectionId: string): Promise<boolean> => {
  if (!user) return false;

  try {
    const { error } = await supabase
      .from('calendar_connections')
      .update({ is_active: false })
      .eq('id', connectionId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error disconnecting provider:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error disconnecting provider:', error);
    return false;
  }
};

export const resetAllCalendarConnections = async (user: User): Promise<boolean> => {
  if (!user) return false;

  try {
    console.log(`[CalendarUtils] Resetting all calendar connections for user:`, user.id);
    
    // First, cleanup any pending connections
    await cleanupPendingConnections(user, 'google');
    await cleanupPendingConnections(user, 'microsoft');
    
    // Then delete all connections for this user
    const { error } = await supabase
      .from('calendar_connections')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error resetting connections:', error);
      return false;
    }

    console.log(`[CalendarUtils] Successfully reset all connections`);
    return true;
  } catch (error) {
    console.error('Unexpected error resetting connections:', error);
    return false;
  }
};

export const validateConnectionToken = async (user: User, connectionId: string): Promise<boolean> => {
  if (!user) return false;

  try {
    console.log(`[CalendarUtils] Validating connection token for:`, connectionId);
    
    const { data: connection, error } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (error || !connection) {
      console.error('Connection not found or error:', error);
      return false;
    }

    // Check if we have a valid access token
    if (!connection.access_token || connection.access_token === 'pending') {
      console.log('Invalid or pending access token');
      return false;
    }

    // Check if token is expired
    if (connection.expires_at) {
      const expiryDate = new Date(connection.expires_at);
      const now = new Date();
      
      if (now >= expiryDate) {
        console.log('Access token has expired');
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Unexpected error validating token:', error);
    return false;
  }
};
