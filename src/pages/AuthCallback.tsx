
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(true);
  const [status, setStatus] = useState('Inloggen...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('[AuthCallback] Processing auth callback...');
        setStatus('Verificatie...');
        
        // Get URL parameters
        const type = searchParams.get('type');
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const scope = searchParams.get('scope');
        
        console.log('[AuthCallback] URL params:', { 
          type,
          code: code ? 'present' : 'missing', 
          state, 
          scope 
        });

        // Get the session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AuthCallback] Session error:', error);
          
          const errorMessages = {
            'invalid_client': 'OAuth configuratie is incorrect.',
            'access_denied': 'Toegang geweigerd. Probeer opnieuw in te loggen.',
            'server_error': 'Server fout. Probeer het later opnieuw.'
          };
          
          const errorKey = error.message.toLowerCase();
          const matchedError = Object.keys(errorMessages).find(key => errorKey.includes(key));
          const userMessage = matchedError ? errorMessages[matchedError as keyof typeof errorMessages] : error.message;
          
          toast({
            title: "Inlog Fout",
            description: userMessage,
            variant: "destructive",
          });
          
          navigate('/login?error=oauth_failed');
          return;
        }

        if (data.session?.user) {
          console.log('[AuthCallback] User authenticated successfully:', data.session.user.id);
          
          if (type === 'calendar' && scope && scope.includes('calendar') && code && state) {
            // This is a calendar OAuth callback
            console.log('[AuthCallback] Processing calendar OAuth callback');
            setStatus('Kalender koppelen...');
            
            try {
              const { data: oauthResult, error: oauthError } = await supabase.functions.invoke('google-calendar-oauth', {
                body: { 
                  code, 
                  state, 
                  user_id: data.session.user.id 
                }
              });

              if (oauthError || !oauthResult?.success) {
                console.error('[AuthCallback] Calendar OAuth failed:', oauthError);
                toast({
                  title: "Kalender Koppeling Mislukt",
                  description: "Er ging iets mis bij het koppelen van je kalender.",
                  variant: "destructive",
                });
              } else {
                console.log('[AuthCallback] Calendar connected successfully');
                toast({
                  title: "Kalender Gekoppeld!",
                  description: `Je kalender is succesvol gekoppeld.`,
                });
              }
            } catch (calendarError) {
              console.error('[AuthCallback] Calendar OAuth error:', calendarError);
              toast({
                title: "Kalender Koppeling Fout",
                description: "Er ging iets mis bij het koppelen van je kalender.",
                variant: "destructive",
              });
            }
          } else {
            // Regular login callback
            console.log('[AuthCallback] Regular login callback');
            toast({
              title: "Welkom!",
              description: "Je bent succesvol ingelogd.",
            });
          }
          
          // Always redirect to profile (dashboard) after authentication
          navigate('/profile');
        } else {
          console.log('[AuthCallback] No session found');
          navigate('/login?message=please_login');
        }
      } catch (error: any) {
        console.error('[AuthCallback] Unexpected error:', error);
        toast({
          title: "Fout",
          description: "Er ging iets mis tijdens het inloggen.",
          variant: "destructive",
        });
        navigate('/login?error=unexpected');
      } finally {
        setProcessing(false);
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams, toast]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-green-600" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {processing ? status : 'Voltooid'}
        </h2>
        <p className="text-gray-600">
          Even geduld terwijl we je inloggen.
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
