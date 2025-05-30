
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('[AuthCallback] Processing auth callback...');
        
        // Check for OAuth errors first
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (error) {
          console.error('[AuthCallback] OAuth error:', error, errorDescription);
          toast({
            title: "Login Error",
            description: errorDescription || "Authentication failed. Please try again.",
            variant: "destructive",
          });
          navigate('/login?error=oauth_failed');
          return;
        }

        // Handle Supabase auth session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[AuthCallback] Session error:', sessionError);
          toast({
            title: "Session Error",
            description: "Failed to establish session. Please try logging in again.",
            variant: "destructive",
          });
          navigate('/login?error=session_failed');
          return;
        }

        if (sessionData.session) {
          console.log('[AuthCallback] Valid session found');
          const user = sessionData.session.user;
          
          // Check if this is a Google OAuth login with provider tokens
          const hasGoogleTokens = sessionData.session.provider_token && 
                                  user.app_metadata?.provider === 'google';
          
          if (hasGoogleTokens) {
            console.log('[AuthCallback] Google OAuth login detected, setting up calendar...');
            
            try {
              // Create or update calendar connection
              const { data: existingConnection } = await supabase
                .from('calendar_connections')
                .select('id, is_active')
                .eq('user_id', user.id)
                .eq('provider', 'google')
                .maybeSingle();

              if (!existingConnection || !existingConnection.is_active) {
                const { error: connectionError } = await supabase
                  .from('calendar_connections')
                  .upsert({
                    user_id: user.id,
                    provider: 'google',
                    provider_account_id: user.user_metadata?.sub || user.id,
                    access_token: sessionData.session.provider_token,
                    refresh_token: sessionData.session.provider_refresh_token || null,
                    expires_at: sessionData.session.expires_at ? 
                      new Date(sessionData.session.expires_at * 1000).toISOString() : null,
                    is_active: true,
                    updated_at: new Date().toISOString()
                  }, {
                    onConflict: 'user_id,provider'
                  });

                if (connectionError) {
                  console.error('[AuthCallback] Calendar connection error:', connectionError);
                } else {
                  console.log('[AuthCallback] Calendar connection created/updated successfully');
                  
                  // Update setup progress
                  await supabase
                    .from('setup_progress')
                    .upsert({
                      user_id: user.id,
                      calendar_linked: true,
                      updated_at: new Date().toISOString()
                    }, {
                      onConflict: 'user_id'
                    });

                  // Trigger initial calendar sync
                  try {
                    await supabase.functions.invoke('sync-calendar-events', {
                      body: { user_id: user.id }
                    });
                    console.log('[AuthCallback] Initial calendar sync triggered');
                  } catch (syncError) {
                    console.warn('[AuthCallback] Calendar sync failed, will retry later:', syncError);
                  }
                }
              }

              toast({
                title: "Welcome!",
                description: "Successfully logged in with Google. Your calendar has been connected.",
              });
              navigate('/profile?success=google_login');
              
            } catch (calendarError) {
              console.error('[AuthCallback] Calendar setup error:', calendarError);
              toast({
                title: "Logged In",
                description: "Login successful, but calendar setup had issues. You can configure it manually.",
                variant: "destructive",
              });
              navigate('/profile?warning=calendar_setup_failed');
            }
          } else {
            // Regular email login
            console.log('[AuthCallback] Regular email login detected');
            toast({
              title: "Welcome!",
              description: "Successfully logged in.",
            });
            navigate('/profile?success=email_login');
          }
        } else {
          // No session - likely email confirmation or signup completion
          console.log('[AuthCallback] No session found - checking for email confirmation');
          
          // Try to get the current user to see if email was just confirmed
          const { data: userData, error: userError } = await supabase.auth.getUser();
          
          if (userData.user && !userError) {
            console.log('[AuthCallback] Email confirmed, user logged in');
            toast({
              title: "Email Confirmed",
              description: "Your email has been confirmed. Welcome!",
            });
            navigate('/profile?success=email_confirmed');
          } else {
            console.log('[AuthCallback] No user found, redirecting to login');
            navigate('/login?message=please_login');
          }
        }
      } catch (error) {
        console.error('[AuthCallback] Unexpected error:', error);
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try logging in again.",
          variant: "destructive",
        });
        navigate('/login?error=unexpected');
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 bg-green-600 rounded-full animate-spin mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Setting up your account...</h1>
        <p className="text-gray-600">Please wait while we complete your login and configure your calendar.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
