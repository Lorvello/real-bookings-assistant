import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { validateEmail, validatePhoneNumber, sanitizeText } from '@/utils/inputSanitization';
import { secureLogger } from '@/utils/secureLogger';
import ProductionSecurity from '@/utils/productionSecurity';

interface BookingData {
  calendarSlug: string;
  serviceTypeId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  startTime: Date;
  endTime: Date;
  notes?: string;
}

interface BookingResult {
  success: boolean;
  booking?: any;
  error?: string;
}

export const usePublicBookingCreation = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const createBooking = async (bookingData: BookingData): Promise<BookingResult> => {
    setLoading(true);
    
    try {
      // Validate and sanitize name
      const nameResult = sanitizeText(bookingData.customerName);
      if (!nameResult.sanitized || nameResult.sanitized.length === 0) {
        throw new Error('Naam is verplicht');
      }
      if (nameResult.sanitized.length > 100) {
        throw new Error('Naam mag maximaal 100 tekens bevatten');
      }

      // Validate email
      const emailResult = validateEmail(bookingData.customerEmail);
      if (!emailResult.valid) {
        throw new Error(emailResult.errors[0] || 'Ongeldig email adres');
      }
      
      // Log suspicious patterns
      if (emailResult.suspicious) {
        secureLogger.security('Suspicious public booking email', {
          calendarSlug: bookingData.calendarSlug,
          patterns: emailResult.errors,
          component: 'usePublicBookingCreation'
        });
      }

      // Validate phone if provided
      let sanitizedPhone: string | undefined = undefined;
      if (bookingData.customerPhone) {
        const phoneResult = validatePhoneNumber(bookingData.customerPhone);
        if (!phoneResult.valid) {
          throw new Error(phoneResult.errors[0] || 'Ongeldig telefoonnummer');
        }
        sanitizedPhone = phoneResult.value;
      }

      // Sanitize notes
      const sanitizedNotes = bookingData.notes ? sanitizeText(bookingData.notes).sanitized : undefined;

      // Time validation
      const now = new Date();
      if (bookingData.startTime <= now) {
        secureLogger.security('Past booking attempt', {
          calendarSlug: bookingData.calendarSlug,
          startTime: bookingData.startTime.toISOString(),
          component: 'usePublicBookingCreation'
        });
        throw new Error('Boekingstijd moet in de toekomst liggen');
      }

      if (bookingData.endTime <= bookingData.startTime) {
        throw new Error('Eindtijd moet na starttijd liggen');
      }

      secureLogger.info('Creating secured public booking', { 
        component: 'usePublicBookingCreation',
        calendarSlug: bookingData.calendarSlug
      });

      // Get the calendar ID based on the slug
      const { data: calendar, error: calendarError } = await supabase
        .from('calendars')
        .select('id')
        .eq('slug', bookingData.calendarSlug)
        .eq('is_active', true)
        .single();

      if (calendarError || !calendar) {
        secureLogger.error('Calendar lookup failed', calendarError, { 
          component: 'usePublicBookingCreation'
        });
        throw new Error('Kalender niet gevonden of inactief');
      }

      // Validate booking security using database function
      const { data: validationResult, error: rpcError } = await supabase.rpc('validate_booking_security', {
        p_calendar_slug: bookingData.calendarSlug,
        p_service_type_id: bookingData.serviceTypeId,
        p_start_time: bookingData.startTime.toISOString(),
        p_end_time: bookingData.endTime.toISOString(),
        p_customer_email: emailResult.value!
      });

      if (rpcError) {
        secureLogger.error('RPC validation failed', rpcError, { 
          component: 'usePublicBookingCreation'
        });
        throw new Error('Validatie mislukt');
      }

      if (validationResult && typeof validationResult === 'object' && 'valid' in validationResult && !validationResult.valid) {
        const errors = (validationResult as any).errors || [];
        secureLogger.error('Booking security validation failed', null, { 
          component: 'usePublicBookingCreation',
          errors
        });
        throw new Error(errors[0]?.message || 'Ongeldige boekingsparameters');
      }

      // Create the booking with sanitized data
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert([{
          calendar_id: calendar.id,
          service_type_id: bookingData.serviceTypeId,
          customer_name: nameResult.sanitized,
          customer_email: emailResult.value!,
          customer_phone: sanitizedPhone,
          start_time: bookingData.startTime.toISOString(),
          end_time: bookingData.endTime.toISOString(),
          notes: sanitizedNotes,
          status: 'pending',
          confirmation_token: crypto.randomUUID()
        }])
        .select()
        .single();

      if (bookingError) {
        secureLogger.error('Booking creation failed', bookingError, { 
          component: 'usePublicBookingCreation'
        });
        throw new Error(bookingError.message || 'Boeken mislukt');
      }

      // Log successful booking creation
      secureLogger.success('Booking created successfully', { 
        component: 'usePublicBookingCreation',
        bookingId: booking.id 
      });

      toast({
        title: "Boeking aangemaakt",
        description: "Je boeking is succesvol aangemaakt.",
      });

      return {
        success: true,
        booking
      };
    } catch (error: any) {
      secureLogger.error('Booking creation error', error, { 
        component: 'usePublicBookingCreation' 
      });

      toast({
        title: "Boeking mislukt",
        description: error.message || "Boeken mislukt. Probeer het opnieuw.",
        variant: "destructive",
      });

      return {
        success: false,
        error: error.message
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    createBooking,
    loading
  };
};
