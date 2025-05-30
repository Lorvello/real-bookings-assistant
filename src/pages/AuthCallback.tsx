
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

  const cleanupFailedConnection = async (userId: string) => {
    try {
      console.log('[AuthCallback] Cleaning up failed connection for user:', userId);
      
      await supabase
        .from('calendar_connections')
        .delete()
        .eq('user_id', userId)
        .eq('provider', 'google')
        .eq('provider_account_id', 'pending');
        
      console.log('[AuthCallback] Failed connection cleanup completed');
    } catch (error) {
      console.error('[AuthCallback] Error during cleanup:', error);
    }
  };

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('[AuthCallback] Processing auth callback...');
        setStatus('Verificatie...');
        
        // Handle the auth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AuthCallback] Session error:', error);
          
          const errorMessages = {
            'invalid_client': 'OAuth configuratie is incorrect. Controleer Google Cloud Console instellingen.',
            'access_denied': 'Toegang geweigerd. Probeer opnieuw in te loggen.',
            'server_error': 'Server fout. Probeer het later opnieuw.',
            'invalid_request': 'Ongeldige OAuth aanvraag. Controleer de configuratie.',
            'unauthorized_client': 'Ongeautoriseerde client. Controleer OAuth instellingen.'
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
          setStatus('Verbinding maken...');
          
          // Check if this was a calendar-specific OAuth flow
          const isCalendarFlow = searchParams.get('calendar') === 'true';
          
          if (isCalendarFlow) {
            console.log('[AuthCallback] Calendar OAuth flow detected');
            
            // Verify we have the necessary tokens for calendar access
            if (!data.session.provider_token) {
              console.error('[AuthCallback] No provider token received for calendar flow');
              
              await cleanupFailedConnection(data.session.user.id);
              
              toast({
                title: "Calendar Verbinding Mislukt",
                description: "Geen toegangstoken ontvangen. Probeer opnieuw.",
                variant: "destructive",
              });
              
              navigate('/profile?error=calendar_token_missing');
              return;
            }
            
            // Wait a moment for the calendar connection to be created
            setStatus('Agenda synchroniseren...');
            
            // Give the auth hook time to process the calendar connection
            let retries = 0;
            const maxRetries = 5;
            
            const checkConnection = async () => {
              try {
                const { data: connections } = await supabase
                  .from('calendar_connections')
                  .select('*')
                  .eq('user_id', data.session!.user.id)
                  .eq('provider', 'google')
                  .eq('is_active', true);
                
                if (connections && connections.length > 0) {
                  console.log('[AuthCallback] Calendar connection verified');
                  
                  toast({
                    title: "Welkom terug!",
                    description: "Google Calendar is succesvol verbonden.",
                  });
                  navigate('/profile?success=calendar_connected');
                } else if (retries < maxRetries) {
                  retries++;
                  console.log(`[AuthCallback] Connection not found, retry ${retries}/${maxRetries}`);
                  setTimeout(checkConnection, 1000);
                } else {
                  console.error('[AuthCallback] Calendar connection failed after max retries');
                  
                  await cleanupFailedConnection(data.session!.user.id);
                  
                  toast({
                    title: "Calendar Verbinding Mislukt",
                    description: "Kon geen verbinding maken met je agenda. Probeer opnieuw via je dashboard.",
                    variant: "destructive",
                  });
                  navigate('/profile?error=calendar_connection_failed');
                }
              } catch (error) {
                console.error('[AuthCallback] Error checking connection:', error);
                navigate('/profile?error=calendar_check_failed');
              }
            };
            
            // Start checking for connection after a short delay
            setTimeout(checkConnection, 2000);
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
