
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleOAuthCallback } = useCalendarIntegration(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Handling auth callback...');
        
        // Check if this is a calendar OAuth callback (has code and state parameters)
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        
        if (error) {
          console.log('OAuth error:', error);
          navigate('/profile?error=oauth_error');
          return;
        }
        
        if (code && state) {
          console.log('Calendar OAuth callback detected');
          
          // Get current user from existing session (don't interfere with auth)
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            console.log('No authenticated user for calendar OAuth callback');
            navigate('/login?error=oauth_no_user');
            return;
          }

          // Handle calendar OAuth callback without affecting user session
          const success = await handleOAuthCallback(code, state, 'google');
          if (success) {
            navigate('/profile?calendar_connected=true');
          } else {
            navigate('/profile?error=calendar_connection_failed');
          }
          return;
        }
        
        // If no OAuth params, this is likely a Supabase auth callback (signup/login)
        const { data, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          console.error('Auth callback error:', authError);
          navigate('/login?error=callback_failed');
          return;
        }

        if (data.session) {
          console.log('Auth callback successful, user session established');
          
          // Check if this user signed in with Google and has provider tokens
          const { data: userData, error: userError } = await supabase.auth.getUser();
          
          if (userData.user && data.session.provider_token) {
            console.log('Google OAuth login detected, creating calendar connection...');
            
            try {
              // Check if calendar connection already exists
              const { data: existingConnection } = await supabase
                .from('calendar_connections')
                .select('id')
                .eq('user_id', userData.user.id)
                .eq('provider', 'google')
                .eq('is_active', true)
                .maybeSingle();

              if (!existingConnection) {
                // Create calendar connection with the OAuth tokens from Supabase Auth
                const { error: connectionError } = await supabase
                  .from('calendar_connections')
                  .insert({
                    user_id: userData.user.id,
                    provider: 'google',
                    provider_account_id: userData.user.user_metadata?.sub || userData.user.id,
                    access_token: data.session.provider_token,
                    refresh_token: data.session.provider_refresh_token || null,
                    expires_at: data.session.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : null,
                    is_active: true
                  });

                if (connectionError) {
                  console.error('Error creating calendar connection:', connectionError);
                } else {
                  console.log('Calendar connection created successfully from Google login');
                  
                  // Update setup progress to reflect calendar is linked
                  const { error: progressError } = await supabase
                    .from('setup_progress')
                    .update({ 
                      calendar_linked: true,
                      updated_at: new Date().toISOString()
                    })
                    .eq('user_id', userData.user.id);

                  if (progressError) {
                    console.error('Error updating setup progress:', progressError);
                  }

                  navigate('/profile?google_signup_complete=true&calendar_connected=true');
                  return;
                }
              } else {
                console.log('Calendar connection already exists');
              }
            } catch (error) {
              console.error('Error in calendar connection creation:', error);
            }
          }
          
          console.log('Regular auth callback, redirecting to profile');
          navigate('/profile');
        } else {
          console.log('No session found, redirecting to login');
          navigate('/login');
        }
      } catch (error) {
        console.error('Unexpected error in auth callback:', error);
        navigate('/login?error=unexpected');
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams, handleOAuthCallback]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 bg-green-600 rounded-full animate-spin mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Completing setup...</h1>
        <p className="text-gray-600">Please wait while we finish setting up your account and calendar connection.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
