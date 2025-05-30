
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
        
        // If no OAuth params, check for regular Supabase auth callback
        const { data, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          console.error('Auth callback error:', authError);
          navigate('/login?error=callback_failed');
          return;
        }

        if (data.session) {
          console.log('Auth callback successful, redirecting to profile');
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Completing connection...</h1>
        <p className="text-gray-600">Please wait while we finish setting up your calendar connection.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
