
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
        console.log('[AuthCallback] Processing calendar OAuth callback...');
        
        // Handle calendar OAuth callback specifically
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        
        if (code && state) {
          console.log('[AuthCallback] Calendar OAuth callback detected');
          
          // Get current user session
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            try {
              // Process the calendar OAuth callback
              const { data, error } = await supabase.functions.invoke('google-calendar-oauth', {
                body: { code, state, user_id: user.id }
              });
              
              if (error) {
                console.error('[AuthCallback] Calendar OAuth error:', error);
                toast({
                  title: "Kalender Verbinding Mislukt",
                  description: "Er ging iets mis bij het verbinden van je kalender",
                  variant: "destructive",
                });
              } else if (data.success) {
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
          }
          
          // Always return to profile dashboard after calendar OAuth
          navigate('/profile');
          return;
        }
        
        // If no calendar OAuth, this shouldn't happen anymore since we removed Google login
        console.log('[AuthCallback] No calendar OAuth parameters found');
        navigate('/login');
        
      } catch (error: any) {
        console.error('[AuthCallback] Unexpected error:', error);
        toast({
          title: "Fout",
          description: "Er ging iets mis. Probeer het opnieuw.",
          variant: "destructive",
        });
        navigate('/login');
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
