
import { z } from 'zod';

export const bookingSchema = z.object({
  title: z.string().min(1, 'Titel is verplicht'),
  location: z.string().optional(),
  date: z.date({
    required_error: 'Datum is verplicht',
  }),
  isAllDay: z.boolean().default(false),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  description: z.string().optional(),
  hasReminder: z.boolean().default(false),
  reminderTiming: z.string().optional(),
  serviceTypeId: z.string().optional(),
  isInternal: z.boolean().default(true),
}).refine((data) => {
  if (!data.isAllDay && (!data.startTime || !data.endTime)) {
    return false;
  }
  // Valideer dat eind tijd na start tijd is
  if (!data.isAllDay && data.startTime && data.endTime) {
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
