
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { handleCalcomOAuthCallback } from '@/utils/calendarSync';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      const provider = searchParams.get('provider');
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      console.log('[AuthCallback] Processing callback:', { provider, code: code?.substring(0, 10), state, error });

      if (error) {
        console.error('[AuthCallback] OAuth error:', error);
        toast({
          title: "Autorisatie Mislukt",
          description: error === 'access_denied' ? 'Toegang geweigerd' : 'Er ging iets mis tijdens autorisatie',
          variant: "destructive",
        });
        navigate('/profile');
        return;
      }

      if (!code || !user) {
        console.error('[AuthCallback] Missing code or user:', { code: !!code, user: !!user });
        toast({
          title: "Autorisatie Onvolledig",
          description: "Ontbrekende autorisatie gegevens",
          variant: "destructive",
        });
        navigate('/profile');
        return;
      }

      try {
        if (provider === 'calcom') {
          console.log('[AuthCallback] Processing Cal.com callback');
          const success = await handleCalcomOAuthCallback(code, state || '', user);
          
          if (success) {
            toast({
              title: "Cal.com Verbonden!",
              description: "Je Cal.com account is succesvol gekoppeld",
            });
          } else {
            throw new Error('Cal.com OAuth failed');
          }
        } else {
          console.error('[AuthCallback] Unknown provider:', provider);
          toast({
            title: "Onbekende Provider",
            description: `Provider '${provider}' wordt niet ondersteund`,
            variant: "destructive",
          });
        }
      } catch (error: any) {
        console.error('[AuthCallback] Callback processing failed:', error);
        toast({
          title: "Verbinding Mislukt",
          description: error.message || "Er ging iets mis tijdens het verbinden",
          variant: "destructive",
        });
      } finally {
        navigate('/profile');
      }
    };

    handleCallback();
  }, [searchParams, user, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-green-600" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Kalender Verbinding Verwerken...
        </h2>
        <p className="text-gray-600">
          Een moment geduld terwijl we je kalender verbinden
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
