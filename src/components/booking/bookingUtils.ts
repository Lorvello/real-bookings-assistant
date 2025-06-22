
import { format } from 'date-fns';
import { BookingFormData } from './bookingSchema';

export const calculateDuration = (startTime: string, endTime: string): number => {
  if (!startTime || !endTime) return 0;
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  return Math.max(0, endMinutes - startMinutes);
};

export const calculateBookingTimes = (data: BookingFormData) => {
  let startTime: string;
  let endTime: string;

  if (data.isAllDay) {
    const dateStr = format(data.date, 'yyyy-MM-dd');
    startTime = `${dateStr}T00:00:00+01:00`;
    endTime = `${dateStr}T23:59:59+01:00`;
  } else {
    if (!data.startTime || !data.endTime) {
      throw new Error('Start time and end time are required for non-all-day events');
    }
    const dateStr = format(data.date, 'yyyy-MM-dd');
    startTime = `${dateStr}T${data.startTime}:00+01:00`;
    endTime = `${dateStr}T${data.endTime}:00+01:00`;
  }

  return { startTime, endTime };
};

export const buildBookingNotes = (data: BookingFormData, duration: number): string => {
  return [
    data.location && `Locatie: ${data.location}`,
    data.description && `Beschrijving: ${data.description}`,
    data.hasReminder && `Herinnering: ${data.reminderTiming} minuten van tevoren`,
    'Interne afspraak - handmatig aangemaakt',
    `Duur: ${duration} minuten`
  ].filter(Boolean).join('\n');
};

export const calculateEndTimeFromService = (startTime: string, duration: number): string => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + duration;
  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
};
