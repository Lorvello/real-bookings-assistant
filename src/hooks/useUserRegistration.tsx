
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BusinessAddress {
  street: string;
  number: string;
  postal: string;
  city: string;
  country: string;
}

interface ServiceType {
  name: string;
  duration: number;
  price?: number;
  description?: string;
}

interface AvailabilityHours {
  start: string;
  end: string;
}

interface WeeklyAvailability {
  monday: AvailabilityHours | null;
  tuesday: AvailabilityHours | null;
  wednesday: AvailabilityHours | null;
  thursday: AvailabilityHours | null;
  friday: AvailabilityHours | null;
  saturday: AvailabilityHours | null;
  sunday: AvailabilityHours | null;
}

interface UserRegistrationData {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

interface UserRegistrationResult {
  success: boolean;
  userId?: string;
  calendarId?: string;
  calendarSlug?: string;
  /** True when signup did NOT return an active session (email confirmation
   * required). The caller must route to /verify-email instead of /dashboard;
   * otherwise the user lands on an auth-gated page with no session and bounces
   * to /login (a silent dead-end). With mailer_autoconfirm on this is false. */
  needsEmailVerification?: boolean;
  error?: string;
}

export const useUserRegistration = () => {
  const { t } = useTranslation('notifications');
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const registerUser = async (data: UserRegistrationData): Promise<UserRegistrationResult> => {
    setLoading(true);

    try {
      console.log('[UserRegistration] Starting comprehensive registration for:', data.email);

      // Stap 1: Registreer gebruiker via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        phone: data.phone || undefined,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: data.fullName,
            phone: data.phone || null
          }
        }
      });

      if (authError) {
        console.error('[UserRegistration] Auth error:', authError);
        let errorMessage = authError.message;
        let shouldShowToast = true;
        
        // Handle specific authentication errors with user-friendly messages
        if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
          errorMessage = t('userRegistration.error.alreadyRegistered', 'This email address is already registered');
        } else if (authError.message.includes('invalid_email') || authError.message.includes('invalid email')) {
          errorMessage = t('userRegistration.error.invalidEmail', 'Please enter a valid email address');
        } else if (authError.message.includes('weak_password') || authError.message.includes('password')) {
          errorMessage = t('userRegistration.error.weakPassword', 'Password does not meet security requirements (minimum 8 characters with uppercase, lowercase, numbers, and special characters)');
        } else if (authError.message.includes('signup_disabled')) {
          errorMessage = t('userRegistration.error.signupDisabled', 'Account registration is currently disabled. Please contact support.');
        } else if (authError.message.includes('rate_limit') || authError.message.includes('too_many_requests')) {
          errorMessage = t('userRegistration.error.rateLimit', 'Too many registration attempts. Please wait a few minutes and try again.');
        } else if (authError.message.includes('network') || authError.message.includes('fetch')) {
          errorMessage = t('userRegistration.error.network', 'Network connection failed. Please check your internet connection and try again.');
        } else if (authError.message.includes('email_rate_limit_exceeded')) {
          errorMessage = t('userRegistration.error.emailRateLimitExceeded', 'Email verification limit reached. Please wait before requesting another verification email.');
        } else {
          // For unknown errors, provide a generic but helpful message
          errorMessage = t('userRegistration.error.generic', 'Unable to create account. Please try again or contact support if the issue continues.');
        }

        if (shouldShowToast) {
          toast({
            title: t('userRegistration.registrationFailedTitle', 'Registration Failed'),
            description: errorMessage,
            variant: "destructive",
          });
        }
        
        setLoading(false);
        return { success: false, error: errorMessage };
      }

      if (!authData.user) {
        const errorMessage = t('userRegistration.userNotCreatedDescription', 'User could not be created');
        console.error('[UserRegistration] No user returned from auth');
        toast({
          title: t('userRegistration.registrationFailedLowerTitle', 'Registration failed'),
          description: errorMessage,
          variant: "destructive",
        });
        setLoading(false);
        return { success: false, error: errorMessage };
      }

      console.log('[UserRegistration] Auth successful, user created:', authData.user.id);

      console.log('[UserRegistration] Auth completed, user will be in setup_incomplete state');

      // Success! The handle_new_user trigger will create the user record with NULL business info
      // This puts them in "setup_incomplete" state automatically.
      // When email confirmation is required, signUp returns no session: route the
      // caller to /verify-email instead of the auth-gated /dashboard.
      const needsEmailVerification = !authData.session;

      toast({
        title: t('userRegistration.accountCreatedTitle', 'Account created successfully! 🎉'),
        description: needsEmailVerification
          ? t('userRegistration.accountCreatedVerifyDescription', 'Check your inbox to verify your email, then complete your business setup.')
          : t('userRegistration.accountCreatedTrialDescription', 'Please complete your business setup to start your 30-day trial.'),
      });

      setLoading(false);
      return {
        success: true,
        userId: authData.user.id,
        needsEmailVerification,
        calendarId: undefined, // Will be created during setup completion
        calendarSlug: undefined
      };
    } catch (error) {
      console.error('[UserRegistration] Unexpected error:', error);
      toast({
        title: t('userRegistration.registrationFailedLowerTitle', 'Registration failed'),
        description: t('userRegistration.unexpectedErrorDescription', 'An unexpected error occurred'),
        variant: "destructive",
      });
      setLoading(false);
      return { success: false, error: "Onverwachte fout" };
    }
  };

  return {
    registerUser,
    loading
  };
};
