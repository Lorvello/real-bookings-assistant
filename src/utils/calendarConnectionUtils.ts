
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
