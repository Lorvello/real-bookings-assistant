
import { useState } from 'react';
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
  error?: string;
}

export const useUserRegistration = () => {
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
          emailRedirectTo: `${window.location.origin}/`,
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
          errorMessage = 'This email address is already registered';
        } else if (authError.message.includes('invalid_email') || authError.message.includes('invalid email')) {
          errorMessage = 'Please enter a valid email address';
        } else if (authError.message.includes('weak_password') || authError.message.includes('password')) {
          errorMessage = 'Password does not meet security requirements (minimum 8 characters with uppercase, lowercase, numbers, and special characters)';
        } else if (authError.message.includes('signup_disabled')) {
          errorMessage = 'Account registration is currently disabled. Please contact support.';
        } else if (authError.message.includes('rate_limit') || authError.message.includes('too_many_requests')) {
          errorMessage = 'Too many registration attempts. Please wait a few minutes and try again.';
        } else if (authError.message.includes('network') || authError.message.includes('fetch')) {
          errorMessage = 'Network connection failed. Please check your internet connection and try again.';
        } else if (authError.message.includes('email_rate_limit_exceeded')) {
          errorMessage = 'Email verification limit reached. Please wait before requesting another verification email.';
        } else {
          // For unknown errors, provide a generic but helpful message
          errorMessage = 'Unable to create account. Please try again or contact support if the issue continues.';
        }

        if (shouldShowToast) {
          toast({
            title: "Registration Failed",
            description: errorMessage,
            variant: "destructive",
          });
        }
        
        setLoading(false);
        return { success: false, error: errorMessage };
      }

      if (!authData.user) {
        const errorMessage = "User could not be created";
        console.error('[UserRegistration] No user returned from auth');
        toast({
          title: "Registration failed",
          description: errorMessage,
          variant: "destructive",
        });
        setLoading(false);
        return { success: false, error: errorMessage };
      }

      console.log('[UserRegistration] Auth successful, user created:', authData.user.id);

      console.log('[UserRegistration] Auth completed, user will be in setup_incomplete state');

      // Success! The handle_new_user trigger will create the user record with NULL business info
      // This puts them in "setup_incomplete" state automatically
      
      toast({
        title: "Account created successfully! 🎉",
        description: "Please complete your business setup to start your 30-day trial.",
      });

      setLoading(false);
      return {
        success: true,
        userId: authData.user.id,
        calendarId: undefined, // Will be created during setup completion
        calendarSlug: undefined
      };
    } catch (error) {
      console.error('[UserRegistration] Unexpected error:', error);
      toast({
        title: "Registration failed",
        description: "An unexpected error occurred",
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
