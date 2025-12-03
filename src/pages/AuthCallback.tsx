import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check for error in URL hash or query params
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        const errorParam = hashParams.get('error') || queryParams.get('error');
        const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');
        const errorCode = hashParams.get('error_code') || queryParams.get('error_code');

        if (errorParam) {
          console.error('[AuthCallback] OAuth error:', errorParam, errorDescription, errorCode);
          
          // Detect database error during user creation
          const isDatabaseError = errorDescription?.toLowerCase().includes('database') ||
                                  errorDescription?.toLowerCase().includes('saving new user') ||
                                  errorCode === 'unexpected_failure';
          
          if (isDatabaseError) {
            setErrorType('database');
            setError('Er is een tijdelijk probleem met het aanmaken van je account. Probeer het opnieuw.');
            toast({
              title: "Account Aanmaken Mislukt",
              description: "Er was een tijdelijk probleem. Probeer het opnieuw.",
              variant: "destructive",
            });
          } else {
            setErrorType('oauth');
            setError(errorDescription || errorParam);
            toast({
              title: "Inloggen Mislukt",
              description: errorDescription || "Kon niet inloggen. Probeer het opnieuw.",
              variant: "destructive",
            });
          }
          return; // Don't auto-redirect, let user choose
        }

        // Wait for Supabase to process the OAuth callback
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('[AuthCallback] Session error:', sessionError);
          setErrorType('session');
          setError(sessionError.message);
          toast({
            title: "Sessie Fout",
            description: "Kon geen sessie starten. Probeer opnieuw in te loggen.",
            variant: "destructive",
          });
          return;
        }

        if (session) {
          console.log('[AuthCallback] Session established successfully');
          toast({
            title: "Welkom!",
            description: "Je bent succesvol ingelogd.",
          });
          navigate('/dashboard');
        } else {
          // No session yet, wait for auth state change
          console.log('[AuthCallback] Waiting for session...');
          
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('[AuthCallback] Auth state changed:', event);
            
            if (event === 'SIGNED_IN' && session) {
              toast({
                title: "Welkom!",
                description: "Je bent succesvol ingelogd.",
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
              setErrorType('session');
              setError('Timeout bij het verkrijgen van sessie. Probeer opnieuw in te loggen.');
            }
          }, 10000);
        }
      } catch (err) {
        console.error('[AuthCallback] Unexpected error:', err);
        setErrorType('unknown');
        setError('Er is een onverwachte fout opgetreden');
        toast({
          title: "Fout",
          description: "Er ging iets mis. Probeer het opnieuw.",
          variant: "destructive",
        });
      }
    };

    handleAuthCallback();
  }, [navigate, toast]);

  const handleRetry = () => {
    // Clear error and retry Google login
    setError(null);
    navigate('/login');
  };

  const handleTryAgain = async () => {
    // Try Google OAuth again directly
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
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md px-4">
        {error ? (
          <>
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {errorType === 'database' ? 'Account Aanmaken Mislukt' : 'Inloggen Mislukt'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {error}
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={handleTryAgain} className="w-full">
                Opnieuw Proberen met Google
              </Button>
              <Button variant="outline" onClick={handleRetry} className="w-full">
                Terug naar Inloggen
              </Button>
            </div>
          </>
        ) : (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Bezig met inloggen...
            </h2>
            <p className="text-muted-foreground">
              Even geduld terwijl we je account verifiëren
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
