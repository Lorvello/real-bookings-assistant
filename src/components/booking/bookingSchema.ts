import { z } from 'zod';
import { validateEmail, sanitizeText } from '@/utils/inputSanitization';
import { isBefore, startOfDay } from 'date-fns';

export const bookingSchema = z.object({
  title: z.string()
    .transform(val => sanitizeText(val).sanitized)
    .refine(val => val.length > 0 && val.length <= 200, {
      message: 'Titel is verplicht en mag maximaal 200 tekens bevatten'
    }),
  
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
  isInternal: z.boolean().default(true),
  
  customerEmail: z.string()
    .transform(val => sanitizeText(val).sanitized)
    .refine(val => !val || val === '' || validateEmail(val).valid, {
      message: 'Ongeldig email formaat'
    })
    .optional()
    .or(z.literal('')),
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
