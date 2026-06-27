import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { validateEmail, validatePhoneNumber, sanitizeText } from '@/utils/inputSanitization';
import { secureLogger } from '@/utils/secureLogger';
import { checkBookingRateLimit } from '@/utils/rateLimiter';
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
  payment_required?: boolean;
}

export const usePublicBookingCreation = () => {
  const { toast } = useToast();
  const { t } = useTranslation('notifications');
  const [loading, setLoading] = useState(false);

  const createBooking = async (bookingData: BookingData): Promise<BookingResult> => {
    setLoading(true);
    
    // Client-side rate limit check
    const clientRateLimit = checkBookingRateLimit('client', bookingData.calendarSlug);
    
    if (!clientRateLimit.allowed) {
      const minutesLeft = Math.ceil((clientRateLimit.blockedUntil!.getTime() - Date.now()) / 60000);
      toast({
        title: t('publicBookingCreation.rateLimitTitle', 'Te veel aanvragen'),
        description: minutesLeft === 1
          ? t('publicBookingCreation.rateLimitDescriptionOne', 'Je hebt te vaak geprobeerd te boeken. Probeer het opnieuw over {{minutes}} minuut.', { minutes: minutesLeft })
          : t('publicBookingCreation.rateLimitDescriptionOther', 'Je hebt te vaak geprobeerd te boeken. Probeer het opnieuw over {{minutes}} minuten.', { minutes: minutesLeft }),
        variant: "destructive",
      });
      setLoading(false);
      return { success: false, error: 'Rate limit exceeded' };
    }

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

      // Get the calendar ID based on the slug, via the owner-privileged public_calendars
      // view (R53; anon SELECT on the base calendars table is revoked). Cast to any because
      // the view isn't in the generated Supabase types.
      const { data: calendar, error: calendarError } = await (supabase as any)
        .from('public_calendars')
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

      // Create booking via edge function (with server-side rate limiting)
      const sanitizedData = {
        calendarSlug: bookingData.calendarSlug,
        serviceTypeId: bookingData.serviceTypeId,
        customerName: nameResult.sanitized,
        customerEmail: emailResult.value!,
        customerPhone: sanitizedPhone,
        startTime: bookingData.startTime.toISOString(),
        endTime: bookingData.endTime.toISOString(),
        notes: sanitizedNotes
      };

      const { data, error } = await supabase.functions.invoke('create-booking', {
        body: sanitizedData
      });

      // Handle 429 rate limit response from server
      if (error && error.status === 429) {
        const retryAfter = error.context?.headers?.['retry-after'];
        const requiresCaptcha = error.context?.headers?.['x-requires-captcha'] === 'true';

        toast({
          title: requiresCaptcha
            ? t('publicBookingCreation.captchaRequiredTitle', 'Verificatie vereist')
            : t('publicBookingCreation.rateLimitTitle', 'Te veel aanvragen'),
          description: requiresCaptcha
            ? t('publicBookingCreation.captchaRequiredDescription', 'Voltooi de CAPTCHA om door te gaan.')
            : t('publicBookingCreation.serverRateLimitDescription', 'Wacht {{seconds}} seconden voordat je het opnieuw probeert.', { seconds: retryAfter }),
          variant: "destructive",
        });

        secureLogger.security('Server rate limit exceeded', {
          calendarSlug: sanitizedData.calendarSlug,
          requiresCaptcha
        });

        setLoading(false);
        return { success: false, error: 'Rate limit exceeded' };
      }

      if (error) {
        // Surface the edge function's own message (e.g. the 409 SLOT_TAKEN conflict:
        // "This time slot is no longer available...") instead of the generic
        // "Edge Function returned a non-2xx status code" — otherwise a customer whose
        // slot was just taken is wrongly told to "try again".
        let message = error.message;
        try {
          const body = await (error as any).context?.json?.();
          if (body?.error) message = body.error;
        } catch { /* keep the default message */ }
        throw new Error(message);
      }

      if (!data?.success || !data?.booking) {
        throw new Error(data?.error || 'Boeking aanmaken mislukt');
      }

      const booking = data.booking;
      // PAY & BOOK: de server geeft payment_required=true terug wanneer de ondernemer
      // vooruitbetaling verplicht heeft. De boeking is dan nog NIET bevestigd — niet
      // 'succesvol' tonen, maar de betaal-flow laten starten (PublicBooking).
      const paymentRequired = data.payment_required === true;

      // Log successful booking creation
      secureLogger.success('Booking created successfully', {
        component: 'usePublicBookingCreation',
        bookingId: booking.id
      });

      if (!paymentRequired) {
        toast({
          title: t('publicBookingCreation.createdTitle', 'Boeking aangemaakt'),
          description: t('publicBookingCreation.createdDescription', 'Je boeking is succesvol aangemaakt.'),
        });
      }

      return {
        success: true,
        payment_required: paymentRequired,
        booking
      };
    } catch (error: any) {
      secureLogger.error('Booking creation error', error, { 
        component: 'usePublicBookingCreation' 
      });

      toast({
        title: t('publicBookingCreation.failedTitle', 'Boeking mislukt'),
        description: error.message || t('publicBookingCreation.failedDescription', 'Boeken mislukt. Probeer het opnieuw.'),
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
