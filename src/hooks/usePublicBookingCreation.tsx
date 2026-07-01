import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { validateEmail, validatePhoneNumber, sanitizeText } from '@/utils/inputSanitization';
import { secureLogger } from '@/utils/secureLogger';
import { checkBookingRateLimit } from '@/utils/rateLimiter';
import ProductionSecurity from '@/utils/productionSecurity';
import { isValidCountryCode } from '@/components/booking/publicBookingFields';
import type { CountryCode } from 'libphonenumber-js';

interface BookingData {
  calendarSlug: string;
  serviceTypeId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  startTime: Date;
  endTime: Date;
  notes?: string;
  // Cross-border (X3a): customer billing country (ISO-3166 alpha-2) + optional EU VAT-ID.
  // Persisted onto the bookings row by create-booking; create-booking-payment reads them
  // back from the row for the Stripe Tax calc. Both optional here (in_person bookings
  // omit them); the public form enforces "required for remote/digital" client-side and
  // create-booking-payment enforces it server-side.
  customerCountry?: string;
  customerVatId?: string;
}

interface BookingResult {
  success: boolean;
  booking?: any;
  error?: string;
  payment_required?: boolean;
}

/**
 * Normalize the many shapes create-booking can put in `body.error` into ONE readable
 * customer-facing string. The edge fn returns a plain string for most rejects (409
 * SLOT_TAKEN, 400 "Invalid email"), but an ARRAY of {field,message} objects for the
 * validate_booking_security failures that are actually the most common on this path:
 * the slot got taken between availability-display and submit (`time_conflict`) and the
 * off-policy `availability` reject. Previously the raw array was thrown straight into a
 * new Error, so those two toasts read "[object Object]". This flattens string | array |
 * object into the joined human messages, and returns undefined when there is nothing
 * usable (so the caller keeps its own default). (FQ-B-WEBBOOK.)
 */
export const extractBookingErrorMessage = (err: unknown): string | undefined => {
  if (typeof err === 'string') {
    const s = err.trim();
    return s.length > 0 ? s : undefined;
  }
  if (Array.isArray(err)) {
    const msgs = err
      .map((e) =>
        typeof e === 'string'
          ? e
          : e && typeof e === 'object' && typeof (e as any).message === 'string'
            ? (e as any).message
            : ''
      )
      .filter((m) => m.trim().length > 0);
    return msgs.length > 0 ? msgs.join('. ') : undefined;
  }
  if (err && typeof err === 'object' && typeof (err as any).message === 'string') {
    const s = (err as any).message.trim();
    return s.length > 0 ? s : undefined;
  }
  return undefined;
};

export const usePublicBookingCreation = () => {
  const { toast } = useToast();
  const { t, i18n } = useTranslation('notifications');
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
      // P1-COUNTRYCODE-BOOKING: this is the real public, international-facing booking
      // form (PublicBooking.tsx). validatePhoneNumber() defaults defaultCountry to 'NL'
      // when not passed, so a non-NL customer's bare national-format number (no leading
      // "+") was either silently mis-normalized as Dutch, or rejected outright as
      // "Ongeldig telefoonnummer" even though it is a real, valid number for their own
      // country (reproduced: a UK customer booking a remote_service appointment, having
      // already selected United Kingdom in the required cross-border-VAT country field,
      // got "invalid phone number" and could not complete the booking at all).
      //
      // The form already collects bookingData.customerCountry (ISO-3166 alpha-2, e.g.
      // "GB") for remote/digital services needing cross-border VAT -- reuse that as the
      // defaultCountry hint instead of hardcoding NL. It is optional (in_person bookings
      // omit it), so this only improves accuracy when a country is already known; the NL
      // fallback stays for the in_person / country-not-collected path where NL remains
      // the right default for this NL-based product today.
      let sanitizedPhone: string | undefined = undefined;
      if (bookingData.customerPhone) {
        const defaultCountry: CountryCode = isValidCountryCode(bookingData.customerCountry)
          ? (bookingData.customerCountry!.trim().toUpperCase() as CountryCode)
          : 'NL';
        const phoneResult = validatePhoneNumber(bookingData.customerPhone, { defaultCountry });
        if (!phoneResult.valid) {
          throw new Error(phoneResult.errors[0] || 'Ongeldig telefoonnummer');
        }
        sanitizedPhone = phoneResult.value;
      }

      // Sanitize notes
      const sanitizedNotes = bookingData.notes ? sanitizeText(bookingData.notes).sanitized : undefined;

      // Cross-border (X3a): normalize the optional tax fields. Country -> ISO-2 uppercase
      // (only when exactly two letters, else dropped); VAT-ID -> uppercase, stripped of
      // spaces/dots/hyphens. These are passed to create-booking which RE-validates +
      // persists onto the bookings row. Client normalization is convenience only; the
      // authoritative VAT decision is Stripe's (create-booking-payment).
      const rawCountry = (bookingData.customerCountry ?? '').trim().toUpperCase();
      const sanitizedCountry = /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : undefined;
      const rawVatId = (bookingData.customerVatId ?? '').toUpperCase().replace(/[\s.\-]/g, '');
      const sanitizedVatId = rawVatId.length > 0 ? rawVatId : undefined;

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
        notes: sanitizedNotes,
        // Cross-border (X3a): only included when present (in_person bookings omit them).
        ...(sanitizedCountry ? { customerCountry: sanitizedCountry } : {}),
        ...(sanitizedVatId ? { customerVatId: sanitizedVatId } : {}),
        // E-4: pass the visitor's UI language so the reminder body is sent in NL or EN.
        // create-booking whitelists this to 'nl'|'en'; anything else is treated as NL.
        customerLocale: (i18n.language || 'nl').slice(0, 2).toLowerCase(),
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
        // "Edge Function returned a non-2xx status code" (otherwise a customer whose
        // slot was just taken is wrongly told to "try again").
        //
        // create-booking returns `error` in TWO shapes: a plain string (409 SLOT_TAKEN,
        // 400 "Invalid email", the 500 generic) AND an ARRAY of {field,message} objects
        // (validate_booking_security failures: the COMMON slot-just-taken `time_conflict`
        // and the off-policy `availability` rejections). Assigning the array straight to
        // the thrown Error stringified it to "[object Object]" (a raw, meaningless toast
        // on the single most likely failure path). Normalize every shape to a readable
        // string so the customer always sees a real message (FQ-B-WEBBOOK).
        let message = error.message;
        try {
          const body = await (error as any).context?.json?.();
          const normalized = extractBookingErrorMessage(body?.error);
          if (normalized) message = normalized;
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

      // NOTE: no success toast on the no-payment path. PublicBooking renders a full
      // success card with its own role="status" aria-live announcement, so a toast
      // would be redundant AND it drags the Radix toast viewport (an <ol> whose
      // role="status" child + aria-hidden focus-proxy sentinels axe flags as serious
      // WCAG 2.1 violations) onto the confirmation surface. Suppressing it keeps the
      // booking-success state axe-clean. Error/rate-limit toasts below are kept:
      // they carry information the inline UI does not surface.

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
