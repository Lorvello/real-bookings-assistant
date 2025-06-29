
import { addMinutes, format, parse } from 'date-fns';
import { BookingFormData } from './bookingSchema';

export const calculateDuration = (startTime: string, endTime: string): number => {
  const start = parse(startTime, 'HH:mm', new Date());
  const end = parse(endTime, 'HH:mm', new Date());
  
  // Handle end time on next day
  if (end < start) {
    const nextDayEnd = new Date(end);
    nextDayEnd.setDate(nextDayEnd.getDate() + 1);
    return Math.round((nextDayEnd.getTime() - start.getTime()) / (1000 * 60));
  }
  
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
};

export const calculateEndTimeFromService = (startTime: string, durationMinutes: number): string => {
  const start = parse(startTime, 'HH:mm', new Date());
  const end = addMinutes(start, durationMinutes);
  return format(end, 'HH:mm');
};

export const calculateBookingTimes = (data: BookingFormData) => {
  const bookingDate = data.date;
  const startTime = new Date(bookingDate);
  const [startHours, startMinutes] = data.startTime.split(':').map(Number);
  startTime.setHours(startHours, startMinutes, 0, 0);

  const endTime = new Date(bookingDate);
  const [endHours, endMinutes] = data.endTime.split(':').map(Number);
  endTime.setHours(endHours, endMinutes, 0, 0);

  // Handle next day scenarios
  if (endTime < startTime) {
    endTime.setDate(endTime.getDate() + 1);
  }

  return {
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString()
  };
};

export const buildBookingNotes = (data: BookingFormData, duration: number): string => {
  let notes = '';
  
  if (data.location && data.location.trim()) {
    notes += `Locatie: ${data.location.trim()}\n`;
  }
  
  if (data.description && data.description.trim()) {
    notes += `Beschrijving: ${data.description.trim()}\n`;
  }
  
  if (data.hasReminder) {
    const reminderText = data.reminderTiming === '30' ? '30 minuten' : 
                        data.reminderTiming === '60' ? '1 uur' :
                        data.reminderTiming === '120' ? '2 uur' :
                        data.reminderTiming === '1440' ? '1 dag' :
                        `${data.reminderTiming} minuten`;
    notes += `Herinnering: ${reminderText} van tevoren\n`;
  }
  
  notes += `Duur: ${duration} minuten\n`;
  notes += `Status: Bevestigd`; // All bookings are now confirmed
  
  return notes.trim();
};
