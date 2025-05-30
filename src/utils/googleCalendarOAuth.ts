
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { cleanupPendingConnections } from './calendarConnectionUtils';

const ensureOAuthProviderExists = async (provider: string) => {
  try {
    // Check if provider exists
    const { data: existingProvider, error: fetchError } = await supabase
      .from('oauth_providers')
      .select('id, provider, client_id, is_active')
      .eq('provider', provider)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, other errors are real problems
      throw fetchError;
    }

    if (!existingProvider) {
      // Create the provider record if it doesn't exist with proper OAuth URLs
      console.log(`Creating OAuth provider record for ${provider}`);
      
      const providerConfig = {
        google: {
          auth_url: 'https://accounts.google.com/o/oauth2/v2/auth',
          token_url: 'https://oauth2.googleapis.com/token',
          scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email'
        },
        microsoft: {
          auth_url: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
          token_url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
          scope: 'https://graph.microsoft.com/calendars.read https://graph.microsoft.com/user.read'
        }
      };

      const config = providerConfig[provider as keyof typeof providerConfig];
      
      const { data: newProvider, error: insertError } = await supabase
        .from('oauth_providers')
        .insert({
          provider: provider,
          client_id: null,
          client_secret: null,
          is_active: false,
          auth_url: config.auth_url,
          token_url: config.token_url,
          scope: config.scope
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      return newProvider;
    }

    return existingProvider;
  } catch (error) {
    console.error(`Error ensuring OAuth provider exists for ${provider}:`, error);
    throw error;
  }
};

export const connectGoogleCalendar = async (user: User): Promise<{ success: boolean; error?: string }> => {
  if (!user) return { success: false, error: 'User not authenticated' };

  try {
    // Ensure the OAuth provider record exists
    const oauthProvider = await ensureOAuthProviderExists('google');
    
    // Check if OAuth is properly configured
    if (!oauthProvider.client_id || !oauthProvider.is_active) {
      const errorMsg = 'Google OAuth is not configured yet. Please configure your Google OAuth credentials in the settings first. You need to:\n\n1. Create a Google Cloud Project\n2. Enable the Google Calendar API\n3. Create OAuth 2.0 credentials\n4. Add the credentials in the OAuth Settings panel\n5. Set the environment variable VITE_GOOGLE_CLIENT_ID';
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
    
    console.log('[OAuth Debug] Starting Google OAuth flow with state:', connectionId);
    
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
