
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
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: data.fullName,
          }
        }
      });

      if (authError) {
        console.error('[UserRegistration] Auth error:', authError);
        let errorMessage = authError.message;
        
        if (authError.message.includes('already registered')) {
          errorMessage = 'This email address is already registered';
        } else if (authError.message.includes('invalid email')) {
          errorMessage = 'Invalid email address';
        } else if (authError.message.includes('password')) {
          errorMessage = 'Password does not meet requirements (minimum 6 characters)';
        }

        toast({
          title: "Registration failed",
          description: errorMessage,
          variant: "destructive",
        });
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
        description: "Please complete your business setup to start your 7-day trial.",
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
