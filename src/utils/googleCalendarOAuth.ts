
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { cleanupPendingConnections, getOAuthProvider } from './calendarConnectionUtils';

export const connectGoogleCalendar = async (user: User): Promise<{ success: boolean; error?: string }> => {
  if (!user) return { success: false, error: 'User not authenticated' };

  try {
    // Get OAuth configuration from database
    const oauthProvider = await getOAuthProvider('google');
    if (!oauthProvider || !oauthProvider.client_id) {
      const errorMsg = 'Google OAuth not configured. Please set up OAuth credentials in settings.';
      return { success: false, error: errorMsg };
    }

    // Clean up any existing pending connections
    await cleanupPendingConnections(user, 'google');

    // Create a new pending connection record with state parameter
    const { data: connectionData, error: connectionError } = await supabase
      .from('calendar_connections')
      .insert({
        user_id: user.id,
        provider: 'google',
        provider_account_id: 'pending',
        is_active: false
      })
      .select()
      .single();

    if (connectionError) {
      return { success: false, error: connectionError.message };
    }

    const connectionId = connectionData.id;
    
    console.log('[OAuth Debug] Using Supabase Auth with state:', connectionId);
    
    // Use Supabase's built-in Google OAuth with scopes for calendar access
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
          state: connectionId
        },
        redirectTo: `${window.location.origin}/auth/google/callback`
      }
    });

    if (error) {
      console.error('Supabase OAuth error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };

  } catch (error: any) {
    console.error('Error connecting to Google:', error);
    return { success: false, error: error.message };
  }
};
