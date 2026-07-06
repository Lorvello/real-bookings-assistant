import { z } from 'zod';
import { validateEmail, sanitizeText } from '@/utils/inputSanitization';
import { isBefore, startOfDay } from 'date-fns';

// SEQP1R10 (P1-9-PHONE2 follow-up): BookingBasicFields.tsx's handlePhoneChange now stores
// libphonenumber-js's own E.164 result.value (e.g. "+31612345678") once a number validates,
// never the raw typed text. This schema-level check is a second, independent gate confirming
// the stored value is ALREADY E.164 shape (a leading "+" followed by 10-15 digits) before the
// form is allowed to submit. It deliberately does NOT re-parse/re-guess a country from a bare
// local-format number here (that ambiguity is exactly the bug class this round fixes) -- a
// value that isn't already "+"-prefixed E.164 is simply rejected, forcing the fix to live at
// the one place a country can actually be known (the live input, via handlePhoneChange), not
// re-litigated here. This is UI-layer validation only; the actual trust boundary against a
// non-browser client posting straight to the DB is the bookings_customer_phone_format CHECK
// constraint (see the SEQP1R10 migration), which this regex intentionally mirrors.
const E164_SHAPE = /^\+[1-9]\d{9,14}$/;

export const bookingSchema = z.object({
  title: z.string()
    .transform(val => sanitizeText(val).sanitized)
    .refine(val => val.length > 0 && val.length <= 200, {
      message: 'Titel is verplicht en mag maximaal 200 tekens bevatten'
    }),
  
  customerName: z.string()
    .transform(val => sanitizeText(val).sanitized)
    .refine(val => val.length > 0 && val.length <= 200, {
      message: 'Naam is verplicht en mag maximaal 200 tekens bevatten'
    }),
  
  customerEmail: z.string()
    .transform(val => val ? sanitizeText(val).sanitized : '')
    .refine(val => !val || val === '' || validateEmail(val).valid, {
      message: 'Ongeldig email formaat'
    })
    .optional()
    .or(z.literal('')),
  
  customerPhone: z.string()
    .transform(val => val ? sanitizeText(val).sanitized : '')
    .refine(val => !val || E164_SHAPE.test(val), {
      message: 'Ongeldig telefoonnummer (verwacht internationaal formaat, bijv. +31612345678)'
    })
    .optional(),
  
  location: z.string()
    .transform(val => val ? sanitizeText(val).sanitized : '')
    .refine(val => !val || val.length <= 500, {
      message: 'Locatie mag maximaal 500 tekens bevatten'
    })
    .optional(),
  
  date: z.date({
    required_error: 'Datum is verplicht',
  }).refine(date => !isBefore(date, startOfDay(new Date())), {
    message: 'Je kunt geen afspraak maken in het verleden'
  }),
  
  startTime: z.string()
    .min(1, 'Start tijd is verplicht')
    .refine(val => /^([01]\d|2[0-3]):([0-5]\d)$/.test(val), {
      message: 'Ongeldige tijd (gebruik formaat HH:mm)'
    }),
  
  endTime: z.string()
    .min(1, 'Eind tijd is verplicht')
    .refine(val => /^([01]\d|2[0-3]):([0-5]\d)$/.test(val), {
      message: 'Ongeldige tijd (gebruik formaat HH:mm)'
    }),
  
  description: z.string()
    .transform(val => val ? sanitizeText(val).sanitized : '')
    .refine(val => !val || val.length <= 2000, {
      message: 'Beschrijving mag maximaal 2000 tekens bevatten'
    })
    .optional(),
  
  hasReminder: z.boolean().default(false),
  reminderTiming: z.string().optional(),
  serviceTypeId: z.string().optional(),
}).refine((data) => {
  // Valideer dat eind tijd na start tijd is
  if (data.startTime && data.endTime) {
    const [startH, startM] = data.startTime.split(':').map(Number);
    const [endH, endM] = data.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return endMinutes > startMinutes;
  }
  return true;
}, {
  message: "Eindtijd moet na starttijd zijn",
  path: ["endTime"],
});

export type BookingFormData = z.infer<typeof bookingSchema>;
