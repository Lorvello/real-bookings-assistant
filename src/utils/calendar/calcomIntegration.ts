
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export interface CalcomOAuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string;
}

export const getCalcomOAuthConfig = async (): Promise<CalcomOAuthConfig | null> => {
  try {
    const { data, error } = await supabase
      .from('oauth_providers')
      .select('*')
      .eq('provider', 'calcom')
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.error('Cal.com OAuth provider not configured:', error);
      return null;
    }

    const redirectUri = `${window.location.origin}/auth/callback?provider=calcom`;

    return {
      clientId: data.client_id || '',
      redirectUri,
      scope: data.scope
    };
  } catch (error) {
    console.error('Error fetching Cal.com OAuth config:', error);
    return null;
  }
};

export const initiateCalcomOAuth = async (user: User) => {
  try {
    console.log('[CalcomIntegration] Starting Cal.com OAuth for user:', user.id);

    const config = await getCalcomOAuthConfig();
    if (!config) {
      throw new Error('Cal.com OAuth not configured');
    }

    // Create pending calendar connection
    const { data: connection, error: connectionError } = await supabase
      .from('calendar_connections')
      .insert({
        user_id: user.id,
        provider: 'calcom',
        provider_account_id: 'pending',
        is_active: false
      })
      .select()
      .single();

    if (connectionError) {
      throw new Error(`Failed to create Cal.com connection: ${connectionError.message}`);
    }

    // Build OAuth URL
    const oauthUrl = new URL('https://api.cal.com/v1/oauth/authorize');
    oauthUrl.searchParams.set('client_id', config.clientId);
    oauthUrl.searchParams.set('redirect_uri', config.redirectUri);
    oauthUrl.searchParams.set('response_type', 'code');
    oauthUrl.searchParams.set('scope', config.scope);
    oauthUrl.searchParams.set('state', connection.id);

    console.log('[CalcomIntegration] Redirecting to Cal.com OAuth:', oauthUrl.toString());

    // Redirect to Cal.com OAuth
    window.location.href = oauthUrl.toString();

  } catch (error) {
    console.error('[CalcomIntegration] OAuth initiation failed:', error);
    throw error;
  }
};

export const syncCalcomBookings = async (user: User): Promise<boolean> => {
  try {
    console.log('[CalcomIntegration] Starting Cal.com booking sync for user:', user.id);

    const { data, error } = await supabase.functions.invoke('sync-calcom-bookings', {
      body: { user_id: user.id }
    });

    if (error) {
      console.error('[CalcomIntegration] Sync failed:', error);
      return false;
    }

    console.log('[CalcomIntegration] Sync completed:', data);
    return true;

  } catch (error) {
    console.error('[CalcomIntegration] Unexpected sync error:', error);
    return false;
  }
};

export const disconnectCalcomProvider = async (user: User, connectionId: string): Promise<boolean> => {
  try {
    console.log('[CalcomIntegration] Disconnecting Cal.com provider:', connectionId);

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
      console.error('[CalcomIntegration] Failed to deactivate connection:', updateError);
      return false;
    }

    // Remove associated calendar events
    const { error: eventsError } = await supabase
      .from('calendar_events')
      .delete()
      .eq('calendar_connection_id', connectionId)
      .eq('user_id', user.id);

    if (eventsError) {
      console.error('[CalcomIntegration] Failed to remove events:', eventsError);
      // Don't return false here as connection is already deactivated
    }

    console.log('[CalcomIntegration] Successfully disconnected Cal.com provider');
    return true;

  } catch (error) {
    console.error('[CalcomIntegration] Disconnect error:', error);
    return false;
  }
};
