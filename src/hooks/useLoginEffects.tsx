
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useLoginEffects = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('notifications');
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Handle URL parameters for error messages
    const error = searchParams.get('error');
    const message = searchParams.get('message');
    
    if (error) {
      const errorMessages = {
        'oauth_failed': t('loginEffects.error.oauthFailed', 'Login failed. Please try again.'),
        'session_failed': t('loginEffects.error.sessionFailed', 'Session could not be established. Please try again.'),
        'unexpected': t('loginEffects.error.unexpected', 'An unexpected error occurred. Please try again.'),
        'callback_failed': t('loginEffects.error.callbackFailed', 'Login callback failed. Please try again.')
      };

      toast({
        title: t('loginEffects.loginErrorTitle', 'Login Error'),
        description: errorMessages[error as keyof typeof errorMessages] || t('loginEffects.error.oauthFailed', 'Login failed. Please try again.'),
        variant: "destructive",
      });
    }

    if (message === 'please_login') {
      toast({
        title: t('loginEffects.pleaseLogInTitle', 'Please Log In'),
        description: t('loginEffects.pleaseLogInDescription', 'Please log in to access your account.'),
      });
    }

    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('[Login] User already logged in, redirecting to dashboard');
        navigate('/dashboard');
      }
    };
    
    checkUser();
  }, [searchParams, toast, navigate, t]);
};
