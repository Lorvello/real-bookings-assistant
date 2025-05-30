
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
        console.log('[AuthCallback] Processing unified auth callback...');
        setStatus('Verificatie...');
        
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
          console.log('[AuthCallback] Provider token available:', !!data.session.provider_token);
          
          const isCalendarFlow = searchParams.get('calendar') === 'true';
          
          if (isCalendarFlow && data.session.provider_token) {
            console.log('[AuthCallback] Calendar OAuth successful with provider token');
            setStatus('Agenda koppelen...');
            
            // Wait for the calendar connection to be processed by useAuth
            setTimeout(() => {
              toast({
                title: "Succesvol Ingelogd",
                description: "Google Calendar wordt gekoppeld...",
              });
              navigate('/profile?success=calendar_login');
            }, 2000);
          } else if (isCalendarFlow && !data.session.provider_token) {
            console.warn('[AuthCallback] Calendar flow but no provider token - scope denied');
            toast({
              title: "Kalendertoegang Geweigerd",
              description: "Geef toestemming voor calendertoegang om te synchroniseren.",
              variant: "destructive",
            });
            navigate('/profile?error=calendar_scope_denied');
          } else {
            // Regular login
            toast({
              title: "Welkom terug!",
              description: "Je bent succesvol ingelogd.",
            });
            navigate('/profile?success=login');
          }
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
          {processing ? status : 'Verwerkt'}
        </h2>
        <p className="text-gray-600">
          Even geduld terwijl we je inloggen.
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
