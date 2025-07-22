
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useLoginEffects = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Handle URL parameters for error messages
    const error = searchParams.get('error');
    const message = searchParams.get('message');
    
    if (error) {
      const errorMessages = {
        'oauth_failed': 'Login failed. Please try again.',
        'session_failed': 'Session could not be established. Please try again.',
        'unexpected': 'An unexpected error occurred. Please try again.',
        'callback_failed': 'Login callback failed. Please try again.'
      };
      
      toast({
        title: "Login Error",
        description: errorMessages[error as keyof typeof errorMessages] || 'Login failed. Please try again.',
        variant: "destructive",
      });
    }
    
    if (message === 'please_login') {
      toast({
        title: "Please Log In",
        description: "Please log in to access your account.",
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
  }, [searchParams, toast, navigate]);
};
