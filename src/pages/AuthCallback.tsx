
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

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('[AuthCallback] Processing auth callback...');
        
        // Handle the auth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AuthCallback] Session error:', error);
          
          const errorMessages = {
            'invalid_client': 'OAuth configuratie is incorrect. Controleer Google Cloud Console instellingen.',
            'access_denied': 'Toegang geweigerd. Probeer opnieuw in te loggen.',
            'server_error': 'Server fout. Probeer het later opnieuw.'
          };
          
          const errorKey = error.message.toLowerCase();
          const userMessage = Object.keys(errorMessages).find(key => errorKey.includes(key));
          
          toast({
            title: "Inlog Fout",
            description: userMessage ? errorMessages[userMessage as keyof typeof errorMessages] : error.message,
            variant: "destructive",
          });
          
          navigate('/login?error=oauth_failed');
          return;
        }

        if (data.session?.user) {
          console.log('[AuthCallback] User authenticated successfully:', data.session.user.id);
          
          // Check if this was a calendar-specific OAuth flow
          const isCalendarFlow = searchParams.get('calendar') === 'true';
          
          if (isCalendarFlow) {
            console.log('[AuthCallback] Calendar OAuth flow detected');
            
            // Wait a moment for the calendar connection to be created
            setTimeout(() => {
              toast({
                title: "Welkom terug!",
                description: "Google Calendar is succesvol verbonden.",
              });
              navigate('/profile?success=calendar_connected');
            }, 2000);
          } else {
            toast({
              title: "Welkom terug!",
              description: "Je bent succesvol ingelogd.",
            });
            navigate('/profile?success=login');
          }
        } else {
          console.log('[AuthCallback] No session found, redirecting to login');
          navigate('/login?message=please_login');
        }
      } catch (error: any) {
        console.error('[AuthCallback] Unexpected error:', error);
        toast({
          title: "Fout",
          description: "Er ging iets mis tijdens het inloggen. Probeer het opnieuw.",
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
          {processing ? 'Inloggen...' : 'Verwerkt'}
        </h2>
        <p className="text-gray-600">
          Even geduld terwijl we je inloggen.
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
