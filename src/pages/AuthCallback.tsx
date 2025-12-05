import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'database' | 'oauth' | 'session' | 'unknown'>('unknown');
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Clear any stale password reset markers
    sessionStorage.removeItem('password-reset-requested');
    
    let mounted = true;

    const redirectToDashboard = () => {
      if (!hasRedirected.current && mounted) {
        hasRedirected.current = true;
        console.log('[AuthCallback] Redirecting to dashboard');
        toast({
          title: "Welcome!",
          description: "You have successfully signed in.",
        });
        navigate('/dashboard', { replace: true });
      }
    };

    // Check for error in URL hash or query params FIRST
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);
    
    const errorParam = hashParams.get('error') || queryParams.get('error');
    const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');
    const errorCode = hashParams.get('error_code') || queryParams.get('error_code');

    if (errorParam) {
      console.error('[AuthCallback] OAuth error:', errorParam, errorDescription, errorCode);
      
      const isDatabaseError = errorDescription?.toLowerCase().includes('database') ||
                              errorDescription?.toLowerCase().includes('saving new user') ||
                              errorCode === 'unexpected_failure';
      
      if (isDatabaseError) {
        setErrorType('database');
        setError('There was a temporary problem creating your account. Please try again.');
      } else {
        setErrorType('oauth');
        setError(errorDescription || errorParam);
      }
      toast({
        title: isDatabaseError ? "Account Creation Failed" : "Sign In Failed",
        description: isDatabaseError ? "There was a temporary problem. Please try again." : (errorDescription || "Could not sign in. Please try again."),
        variant: "destructive",
      });
      return; // Don't set up listener if there's an error
    }

    // IMPORTANT: Set up auth state listener FIRST before checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthCallback] Auth state changed:', event, session ? 'has session' : 'no session');
      
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        redirectToDashboard();
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
          navigate('/login', { replace: true });
        }
      }
    });

    // THEN check for existing session (handles case where session is already established)
    const checkExistingSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('[AuthCallback] Session error:', sessionError);
          if (mounted) {
            setErrorType('session');
            setError(sessionError.message);
            toast({
              title: "Session Error",
              description: "Could not establish session. Please try signing in again.",
              variant: "destructive",
            });
          }
          return;
        }

        if (session) {
          console.log('[AuthCallback] Session already exists');
          redirectToDashboard();
        }
      } catch (err) {
        console.error('[AuthCallback] Unexpected error:', err);
        if (mounted) {
          setErrorType('unknown');
          setError('An unexpected error occurred');
          toast({
            title: "Error",
            description: "Something went wrong. Please try again.",
            variant: "destructive",
          });
        }
      }
    };

    checkExistingSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  const handleRetry = () => {
    setError(null);
    navigate('/login', { replace: true });
  };

  const handleTryAgain = async () => {
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
      }
    } catch (err) {
      console.error('Retry error:', err);
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md px-4">
        {error ? (
          <>
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {errorType === 'database' ? 'Account Creation Failed' : 'Sign In Failed'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {error}
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={handleTryAgain} className="w-full">
                Try Again with Google
              </Button>
              <Button variant="outline" onClick={handleRetry} className="w-full">
                Back to Sign In
              </Button>
            </div>
          </>
        ) : (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Signing in...
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
