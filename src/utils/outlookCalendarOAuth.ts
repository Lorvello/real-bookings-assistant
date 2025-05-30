
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { cleanupPendingConnections, getOAuthProvider } from './calendarConnectionUtils';

export const connectOutlookCalendar = async (user: User): Promise<{ success: boolean; error?: string }> => {
  if (!user) return { success: false, error: 'User not authenticated' };

  try {
    // Get OAuth configuration from database
    const oauthProvider = await getOAuthProvider('microsoft');
    if (!oauthProvider || !oauthProvider.client_id) {
      const errorMsg = 'Microsoft OAuth not configured. Please set up OAuth credentials in settings.';
      return { success: false, error: errorMsg };
    }

    // Clean up any existing pending connections for this provider
    await cleanupPendingConnections(user, 'microsoft');

    // Create a new pending connection record
    const { data: connectionData, error: connectionError } = await supabase
      .from('calendar_connections')
      .insert({
        user_id: user.id,
        provider: 'microsoft',
        provider_account_id: 'pending',
        is_active: false
      })
      .select()
      .single();

    if (connectionError) {
      return { success: false, error: connectionError.message };
    }

    const connectionId = connectionData.id;
    const baseUrl = window.location.origin;
    const redirectUri = `${baseUrl}/auth/outlook/callback`;

    // Build Microsoft OAuth URL
    const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    authUrl.searchParams.set('client_id', oauthProvider.client_id);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'https://graph.microsoft.com/calendars.read https://graph.microsoft.com/user.read');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('response_mode', 'query');
    authUrl.searchParams.set('state', connectionId);
    
    console.log('[OAuth Debug] Constructed Microsoft OAuth URL');
    console.log('[OAuth Debug] Redirect URI:', redirectUri);
    
    window.location.href = authUrl.toString();
    return { success: true };

  } catch (error: any) {
    console.error('Error connecting to Outlook:', error);
    return { success: false, error: error.message };
  }
};
