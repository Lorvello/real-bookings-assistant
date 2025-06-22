
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
  businessName: string;
  businessType: string;
  businessAddress: BusinessAddress;
  businessEmail: string;
  serviceTypes: ServiceType[];
  availability: WeeklyAvailability;
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
            business_name: data.businessName,
          }
        }
      });

      if (authError) {
        console.error('[UserRegistration] Auth error:', authError);
        let errorMessage = authError.message;
        
        if (authError.message.includes('already registered')) {
          errorMessage = 'Dit e-mailadres is al geregistreerd';
        } else if (authError.message.includes('invalid email')) {
          errorMessage = 'Ongeldig e-mailadres';
        } else if (authError.message.includes('password')) {
          errorMessage = 'Wachtwoord voldoet niet aan de eisen (minimaal 6 karakters)';
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

      // Stap 3: Voeg service types toe
      if (data.serviceTypes.length > 0 && result.calendar_id) {
        for (const serviceType of data.serviceTypes) {
          const { error: serviceError } = await supabase
            .from('service_types')
            .insert({
              calendar_id: result.calendar_id,
              name: serviceType.name,
              duration: serviceType.duration,
              price: serviceType.price,
              description: serviceType.description,
              color: '#3B82F6',
              is_active: true,
              max_attendees: 1,
              preparation_time: 0,
              cleanup_time: 0
            });
          
          if (serviceError) {
            console.error('[UserRegistration] Service type creation error:', serviceError);
          }
        }
      }

      console.log('[UserRegistration] Registration completely successful');
      
      toast({
        title: "Account succesvol aangemaakt! 🎉",
        description: "Je account en bedrijfsprofiel zijn volledig ingesteld. Je bent automatisch ingelogd.",
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
