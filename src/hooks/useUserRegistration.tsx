
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserRegistrationData {
  email: string;
  password: string;
  fullName?: string;
  businessName?: string;
  businessType?: string;
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
      console.log('[UserRegistration] Starting registration for:', data.email);

      // Stap 1: Registreer gebruiker via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: data.fullName,
            business_name: data.businessName,
          }
        }
      });

      if (authError) {
        console.error('[UserRegistration] Auth error:', authError);
        let errorMessage = authError.message;
        
        // Verbeter Nederlandse foutmeldingen
        if (authError.message.includes('already registered')) {
          errorMessage = 'Dit e-mailadres is al geregistreerd';
        } else if (authError.message.includes('invalid email')) {
          errorMessage = 'Ongeldig e-mailadres';
        } else if (authError.message.includes('password')) {
          errorMessage = 'Wachtwoord voldoet niet aan de eisen';
        }

        toast({
          title: "Registratie gefaald",
          description: errorMessage,
          variant: "destructive",
        });
        setLoading(false);
        return { success: false, error: errorMessage };
      }

      if (!authData.user) {
        const errorMessage = "Gebruiker kon niet worden aangemaakt";
        console.error('[UserRegistration] No user returned from auth');
        toast({
          title: "Registratie gefaald",
          description: errorMessage,
          variant: "destructive",
        });
        setLoading(false);
        return { success: false, error: errorMessage };
      }

      console.log('[UserRegistration] Auth successful, user created:', authData.user.id);

      // Stap 2: Roep database functie aan voor complete setup
      const { data: setupResult, error: setupError } = await supabase.rpc(
        'create_user_with_calendar',
        {
          p_email: data.email,
          p_full_name: data.fullName,
          p_business_name: data.businessName,
          p_business_type: data.businessType
        }
      );

      console.log('[UserRegistration] Setup result:', setupResult);

      if (setupError) {
        console.error('[UserRegistration] Setup error:', setupError);
        toast({
          title: "Setup gefaald",
          description: setupError.message || "Onbekende fout tijdens setup",
          variant: "destructive",
        });
        setLoading(false);
        return { 
          success: false, 
          error: setupError.message || "Setup gefaald" 
        };
      }

      // Type cast the JSON response to our expected structure
      const result = setupResult as unknown as UserRegistrationResult & {
        user_id?: string;
        calendar_id?: string;
        calendar_slug?: string;
      };

      if (!result?.success) {
        console.error('[UserRegistration] Setup function returned failure:', result);
        toast({
          title: "Setup gefaald",
          description: result?.error || "Setup functie gefaald",
          variant: "destructive",
        });
        setLoading(false);
        return { 
          success: false, 
          error: result?.error || "Setup gefaald" 
        };
      }

      console.log('[UserRegistration] Registration completely successful');
      
      toast({
        title: "Registratie succesvol! 🎉",
        description: "Je account en kalender zijn aangemaakt. Je bent automatisch ingelogd.",
      });

      setLoading(false);
      return {
        success: true,
        userId: result.user_id || authData.user.id,
        calendarId: result.calendar_id,
        calendarSlug: result.calendar_slug
      };
    } catch (error) {
      console.error('[UserRegistration] Unexpected error:', error);
      toast({
        title: "Registratie gefaald",
        description: "Er is een onverwachte fout opgetreden",
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
