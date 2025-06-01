
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
        console.log('[AuthCallback] Processing OAuth callback...');
        
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        
        if (error) {
          console.error('[AuthCallback] OAuth error:', error);
          toast({
            title: "Verbinding Mislukt",
            description: "Er ging iets mis tijdens de autorisatie",
            variant: "destructive",
          });
          navigate('/profile');
          return;
        }
        
        if (code && state) {
          console.log('[AuthCallback] Processing calendar OAuth callback with state:', state);
          
          // Verify the state parameter
          const storedState = localStorage.getItem('oauth_state');
          const storedUserId = localStorage.getItem('oauth_user_id');
          
          if (state !== storedState) {
            console.error('[AuthCallback] State mismatch - possible CSRF attack');
            toast({
              title: "Beveiligingsfout",
              description: "Ongeldige OAuth status parameter",
              variant: "destructive",
            });
            navigate('/profile');
            return;
          }
          
          // Clean up localStorage
          localStorage.removeItem('oauth_state');
          localStorage.removeItem('oauth_user_id');
          
          // Get current user session
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user && storedUserId === user.id) {
            try {
              // Process the calendar OAuth callback using the google-calendar-oauth function
              const { data, error } = await supabase.functions.invoke('google-calendar-oauth', {
                body: { 
                  code, 
                  state,
                  user_id: user.id 
                }
              });
              
              if (error) {
                console.error('[AuthCallback] Calendar OAuth error:', error);
                toast({
                  title: "Kalender Verbinding Mislukt",
                  description: error.message || "Er ging iets mis bij het verbinden van je kalender",
                  variant: "destructive",
                });
              } else if (data?.success) {
                console.log('[AuthCallback] Calendar connection successful');
                toast({
                  title: "Kalender Verbonden",
                  description: "Je Google Calendar is succesvol verbonden",
                });
              }
            } catch (error) {
              console.error('[AuthCallback] Calendar OAuth processing error:', error);
              toast({
                title: "Verbinding Mislukt",
                description: "Er ging iets mis tijdens het verwerken van de kalender verbinding",
                variant: "destructive",
              });
            }
          } else {
            console.error('[AuthCallback] User verification failed');
            toast({
              title: "Autorisatie Mislukt",
              description: "Kon gebruiker niet verifiëren",
              variant: "destructive",
            });
          }
          
          // Always return to profile dashboard after calendar OAuth
          navigate('/profile');
          return;
        }
        
        // If no parameters, just redirect to profile
        console.log('[AuthCallback] No OAuth parameters found, redirecting to profile');
        navigate('/profile');
        
      } catch (error: any) {
        console.error('[AuthCallback] Unexpected error:', error);
        toast({
          title: "Fout",
          description: "Er ging iets mis. Probeer het opnieuw.",
          variant: "destructive",
        });
        navigate('/profile');
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
          Kalender Verbinden...
        </h2>
        <p className="text-gray-600">
          Even geduld terwijl we je kalender verbinden.
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
