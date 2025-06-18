
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
        toast({
          title: "Registratie gefaald",
          description: authError.message,
          variant: "destructive",
        });
        setLoading(false);
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        const errorMessage = "Gebruiker kon niet worden aangemaakt";
        toast({
          title: "Registratie gefaald",
          description: errorMessage,
          variant: "destructive",
        });
        setLoading(false);
        return { success: false, error: errorMessage };
      }

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

      // Type cast the JSON response to our expected structure
      const result = setupResult as unknown as UserRegistrationResult & {
        user_id?: string;
        calendar_id?: string;
        calendar_slug?: string;
      };

      if (setupError || !result?.success) {
        console.error('Setup error:', setupError);
        toast({
          title: "Setup gefaald",
          description: result?.error || setupError?.message || "Onbekende fout",
          variant: "destructive",
        });
        setLoading(false);
        return { 
          success: false, 
          error: result?.error || setupError?.message || "Setup gefaald" 
        };
      }

      toast({
        title: "Registratie succesvol!",
        description: "Je account en kalender zijn aangemaakt. Controleer je email voor bevestiging.",
      });

      setLoading(false);
      return {
        success: true,
        userId: result.user_id,
        calendarId: result.calendar_id,
        calendarSlug: result.calendar_slug
      };
    } catch (error) {
      console.error('Registration error:', error);
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
