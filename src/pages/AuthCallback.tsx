
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

        // Wait longer for session to be established
        let session = null;
        let retries = 5;
        
        while (retries > 0 && !session) {
          console.log('[AuthCallback] Checking for session, retries left:', retries);
          
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('[AuthCallback] Session error:', sessionError);
            retries--;
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } else if (sessionData.session) {
            session = sessionData.session;
            console.log('[AuthCallback] Valid session found');
            break;
          } else {
            retries--;
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }

        if (!session) {
          console.log('[AuthCallback] No session found after retries');
          toast({
            title: "Session Error",
            description: "Failed to establish session. Please try logging in again.",
            variant: "destructive",
          });
          navigate('/login?error=session_failed');
          return;
        }

        const user = session.user;
        
        // Check if this is a Google OAuth login with provider tokens
        const hasGoogleTokens = session.provider_token && 
                                user.app_metadata?.provider === 'google';
        
        console.log('[AuthCallback] User provider:', user.app_metadata?.provider);
        console.log('[AuthCallback] Has Google tokens:', hasGoogleTokens);
        
        // Extended delay to ensure user creation trigger has completed
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        if (hasGoogleTokens) {
          console.log('[AuthCallback] Google OAuth login detected, setting up calendar...');
          
          try {
            // Check if calendar connection already exists with retries
            let existingConnection = null;
            let connectionRetries = 3;
            
            while (connectionRetries > 0 && !existingConnection) {
              const { data } = await supabase
                .from('calendar_connections')
                .select('id, is_active')
                .eq('user_id', user.id)
                .eq('provider', 'google')
                .maybeSingle();
                
              existingConnection = data;
              
              if (!existingConnection) {
                connectionRetries--;
                if (connectionRetries > 0) {
                  console.log('[AuthCallback] Connection not found, retrying...', connectionRetries);
                  await new Promise(resolve => setTimeout(resolve, 1500));
                }
              }
            }

            if (!existingConnection || !existingConnection.is_active) {
              console.log('[AuthCallback] Creating/updating calendar connection...');
              
              const { error: connectionError } = await supabase
                .from('calendar_connections')
                .upsert({
                  user_id: user.id,
                  provider: 'google',
                  provider_account_id: user.user_metadata?.sub || user.id,
                  access_token: session.provider_token,
                  refresh_token: session.provider_refresh_token || null,
                  expires_at: session.expires_at ? 
                    new Date(session.expires_at * 1000).toISOString() : null,
                  is_active: true,
                  updated_at: new Date().toISOString()
                }, {
                  onConflict: 'user_id,provider'
                });

              if (connectionError) {
                console.error('[AuthCallback] Calendar connection error:', connectionError);
                throw connectionError;
              } else {
                console.log('[AuthCallback] Calendar connection created/updated successfully');
                
                // Update setup progress with retries
                let setupRetries = 3;
                let setupSuccess = false;
                
                while (setupRetries > 0 && !setupSuccess) {
                  const { error: setupError } = await supabase
                    .from('setup_progress')
                    .upsert({
                      user_id: user.id,
                      calendar_linked: true,
                      updated_at: new Date().toISOString()
                    }, {
                      onConflict: 'user_id'
                    });
                    
                  if (!setupError) {
                    setupSuccess = true;
                    console.log('[AuthCallback] Setup progress updated successfully');
                  } else {
                    setupRetries--;
                    console.warn('[AuthCallback] Setup progress update failed, retrying...', setupRetries);
                    if (setupRetries > 0) {
                      await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                  }
                }

                // Trigger initial calendar sync with delay
                setTimeout(async () => {
                  try {
                    await supabase.functions.invoke('sync-calendar-events', {
                      body: { user_id: user.id }
                    });
                    console.log('[AuthCallback] Initial calendar sync triggered');
                  } catch (syncError) {
                    console.warn('[AuthCallback] Calendar sync failed, will retry later:', syncError);
                  }
                }, 2000);
              }
            } else {
              console.log('[AuthCallback] Calendar connection already active');
              
              // Update tokens if they're different
              if (existingConnection && session.provider_token) {
                await supabase
                  .from('calendar_connections')
                  .update({
                    access_token: session.provider_token,
                    refresh_token: session.provider_refresh_token || null,
                    expires_at: session.expires_at ? 
                      new Date(session.expires_at * 1000).toISOString() : null,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', existingConnection.id);
                
                console.log('[AuthCallback] Calendar connection tokens updated');
              }
            }

            toast({
              title: "Welcome!",
              description: "Successfully logged in with Google. Your calendar has been connected.",
            });
            
          } catch (calendarError) {
            console.error('[AuthCallback] Calendar setup error:', calendarError);
            toast({
              title: "Logged In",
              description: "Login successful, but calendar setup had issues. You can configure it manually.",
              variant: "destructive",
            });
          }
        } else {
          // Regular email login or other OAuth
          console.log('[AuthCallback] Regular login detected');
          toast({
            title: "Welcome!",
            description: "Successfully logged in.",
          });
        }
        
        // Navigate to profile after successful processing
        console.log('[AuthCallback] Redirecting to profile...');
        navigate('/profile');
        
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
