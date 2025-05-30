
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
        
        // Check if this is an OAuth callback (has code and state parameters)
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        
        if (code && state) {
          console.log('OAuth callback detected');
          
          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            console.log('No authenticated user for OAuth callback');
            navigate('/login?error=oauth_no_user');
            return;
          }

          // Handle OAuth callback
          const success = await handleOAuthCallback(code, state);
          if (success) {
            navigate('/profile?calendar_connected=true');
          } else {
            navigate('/profile?error=calendar_connection_failed');
          }
          return;
        }
        
        // Regular Supabase auth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Completing sign in...</h1>
        <p className="text-gray-600">Please wait while we finish setting up your account.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
