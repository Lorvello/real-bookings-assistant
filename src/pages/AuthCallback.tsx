import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check for error in URL hash or query params
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        const errorParam = hashParams.get('error') || queryParams.get('error');
        const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');

        if (errorParam) {
          console.error('[AuthCallback] OAuth error:', errorParam, errorDescription);
          setError(errorDescription || errorParam);
          toast({
            title: "Authentication Failed",
            description: errorDescription || "Could not complete sign in. Please try again.",
            variant: "destructive",
          });
          setTimeout(() => navigate('/login?error=oauth_failed'), 2000);
          return;
        }

        // Wait for Supabase to process the OAuth callback
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('[AuthCallback] Session error:', sessionError);
          setError(sessionError.message);
          toast({
            title: "Session Error",
            description: "Could not establish session. Please try again.",
            variant: "destructive",
          });
          setTimeout(() => navigate('/login?error=session_failed'), 2000);
          return;
        }

        if (session) {
          console.log('[AuthCallback] Session established successfully');
          toast({
            title: "Welcome!",
            description: "You have successfully signed in.",
          });
          navigate('/dashboard');
        } else {
          // No session yet, wait for auth state change
          console.log('[AuthCallback] Waiting for session...');
          
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('[AuthCallback] Auth state changed:', event);
            
            if (event === 'SIGNED_IN' && session) {
              toast({
                title: "Welcome!",
                description: "You have successfully signed in.",
              });
              subscription.unsubscribe();
              navigate('/dashboard');
            } else if (event === 'SIGNED_OUT') {
              subscription.unsubscribe();
              navigate('/login');
            }
          });

          // Timeout fallback
          setTimeout(() => {
            subscription.unsubscribe();
            if (!session) {
              console.log('[AuthCallback] Timeout - no session received');
              navigate('/login?error=callback_failed');
            }
          }, 10000);
        }
      } catch (err) {
        console.error('[AuthCallback] Unexpected error:', err);
        setError('An unexpected error occurred');
        toast({
          title: "Error",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
        setTimeout(() => navigate('/login?error=unexpected'), 2000);
      }
    };

    handleAuthCallback();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        {error ? (
          <>
            <div className="h-8 w-8 mx-auto mb-4 text-destructive">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Authentication Failed
            </h2>
            <p className="text-muted-foreground">
              {error}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Redirecting to login...
            </p>
          </>
        ) : (
          <>
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Completing Sign In...
            </h2>
            <p className="text-muted-foreground">
              Please wait while we verify your account
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
