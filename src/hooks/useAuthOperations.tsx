import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { sanitizeUserInput } from '@/utils/inputSanitization';
import { validatePassword } from '@/utils/passwordValidation';

interface SignInData {
  email: string;
  password: string;
}

interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

interface ResetPasswordData {
  email: string;
}

export const useAuthOperations = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { handleError, retryWithBackoff } = useErrorHandler();
  const [loading, setLoading] = useState(false);

  const signIn = async (data: SignInData) => {
    setLoading(true);
    
    try {
      const sanitizedEmail = sanitizeUserInput(data.email, 'email');
      
      if (!sanitizedEmail || !data.password) {
        throw new Error('Please enter both email and password');
      }

      // Email format validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
        throw new Error('Please enter a valid email address');
      }

      const result = await retryWithBackoff(async () => {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: sanitizedEmail,
          password: data.password
        });

        if (error) {
          if (error.message === 'email_not_confirmed') {
            navigate('/verify-email', { state: { email: sanitizedEmail } });
            return { needsVerification: true };
          }
          throw error;
        }

        return authData;
      }, 2, 1000);

      if (result.needsVerification) {
        return { success: true, needsVerification: true };
      }

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });

      navigate('/dashboard');
      return { success: true };

    } catch (error: any) {
      console.error('[Auth] Sign in error:', error);
      
      const userFriendlyMessages: Record<string, string> = {
        'invalid_credentials': 'Invalid email or password. Please check your credentials.',
        'too_many_requests': 'Too many login attempts. Please wait 15 minutes and try again.',
        'user_not_found': 'No account found with this email. Please check your email or sign up.',
        'account_suspended': 'Your account has been suspended. Please contact support.',
        'network_request_failed': 'Connection failed. Please check your internet and try again.'
      };

      const message = userFriendlyMessages[error.message] || 
        (error.message.includes('Please enter') ? error.message : 
         'Unable to sign in. Please try again.');

      toast({
        title: "Sign In Failed",
        description: message,
        variant: "destructive",
      });

      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (data: SignUpData) => {
    setLoading(true);
    
    try {
      const sanitizedEmail = sanitizeUserInput(data.email, 'email');
      const sanitizedName = sanitizeUserInput(data.fullName, 'business');
      
      if (!sanitizedEmail || !data.password || !sanitizedName) {
        throw new Error('Please fill in all required fields');
      }

      // Email format validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
        throw new Error('Please enter a valid email address');
      }

      // Password validation
      const passwordValidation = validatePassword(data.password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors[0] || 'Password does not meet security requirements');
      }

      const result = await retryWithBackoff(async () => {
        const { data: authData, error } = await supabase.auth.signUp({
          email: sanitizedEmail,
          password: data.password,
          phone: data.phone || undefined,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: sanitizedName,
              phone: data.phone || null
            }
          }
        });

        if (error) {
          throw error;
        }

        return authData;
      }, 2, 1000);

      if (!result.user) {
        throw new Error('Account could not be created');
      }

      toast({
        title: "Account created successfully! 🎉",
        description: "Please complete your business setup to start your 30-day trial.",
      });

      navigate('/dashboard');
      return { success: true, userId: result.user.id };

    } catch (error: any) {
      console.error('[Auth] Sign up error:', error);
      
      const userFriendlyMessages: Record<string, string> = {
        'already_registered': 'An account with this email already exists. Try signing in instead.',
        'invalid_email': 'Please enter a valid email address.',
        'weak_password': 'Password does not meet security requirements.',
        'signup_disabled': 'Account registration is currently disabled. Please contact support.',
        'rate_limit_exceeded': 'Too many registration attempts. Please wait and try again.',
        'email_rate_limit_exceeded': 'Email verification limit reached. Please wait before trying again.'
      };

      let message = userFriendlyMessages[error.message] || error.message;
      
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        message = `An account with ${data.email} already exists. Try signing in instead.`;
      } else if (!userFriendlyMessages[error.message] && !error.message.includes('Please')) {
        message = 'Unable to create account. Please try again or contact support.';
      }

      toast({
        title: "Registration Failed",
        description: message,
        variant: "destructive",
      });

      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (data: ResetPasswordData) => {
    setLoading(true);
    
    try {
      const sanitizedEmail = sanitizeUserInput(data.email, 'email');
      
      if (!sanitizedEmail) {
        throw new Error('Please enter your email address');
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
        throw new Error('Please enter a valid email address');
      }

      // Mark that a password reset was requested
      sessionStorage.setItem('password-reset-requested', '1');
      
      await retryWithBackoff(async () => {
        const { data, error } = await supabase.functions.invoke('send-password-reset', {
          body: {
            email: sanitizedEmail,
            redirectTo: `${window.location.origin}/reset-password`,
          },
        });

        if (error) {
          sessionStorage.removeItem('password-reset-requested');
          throw error;
        }
        if (data && (data.error || data.success === false)) {
          sessionStorage.removeItem('password-reset-requested');
          throw new Error(data.error || 'Failed to send reset email');
        }
      }, 2, 1000);

      toast({
        title: "Reset Email Sent",
        description: "Check your email for password reset instructions. If you don't see it, check your spam folder.",
      });

      return { success: true };

    } catch (error: any) {
      console.error('[Auth] Password reset error:', error);
      handleError(error, 'Password reset');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async (email: string) => {
    setLoading(true);
    
    try {
      const sanitizedEmail = sanitizeUserInput(email, 'email');
      
      await retryWithBackoff(async () => {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: sanitizedEmail,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });

        if (error) {
          if (error.message.includes('already confirmed')) {
            toast({
              title: "Already Verified",
              description: "Your email is already verified. You can now sign in.",
            });
            navigate('/login');
            return;
          }
          throw error;
        }
      }, 2, 1000);

      toast({
        title: "Email Sent",
        description: "A new verification email has been sent. Please check your inbox and spam folder.",
      });

      return { success: true };

    } catch (error: any) {
      console.error('[Auth] Resend verification error:', error);
      handleError(error, 'Email verification resend');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    signIn,
    signUp,
    resetPassword,
    resendVerification,
    loading
  };
};