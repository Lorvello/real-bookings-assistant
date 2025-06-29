
import { supabase } from '@/integrations/supabase/client';
import { CalendarSettings } from '@/types/database';

export const fetchCalendarSettings = async (calendarId: string): Promise<CalendarSettings | null> => {
  const { data, error } = await supabase
    .from('calendar_settings')
    .select('*')
    .eq('calendar_id', calendarId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No settings found
      return null;
    }
    console.error('Error fetching calendar settings:', error);
    throw error;
  }

  return data;
};

export const createDefaultCalendarSettings = async (
  calendarId: string, 
  userId?: string
): Promise<CalendarSettings | null> => {
  if (!userId) return null;

  try {
    const defaultSettings = {
      calendar_id: calendarId,
      user_id: userId,
      confirmation_required: true,
      allow_waitlist: false,
      whatsapp_bot_active: false,
      slot_duration: 30,
      buffer_time: 0,
      minimum_notice_hours: 1,
      booking_window_days: 60,
      max_bookings_per_day: null
    };

    const { data, error } = await supabase
      .from('calendar_settings')
      .insert(defaultSettings)
      .select()
      .single();

    if (error) {
      console.error('Error creating default settings:', error);
      return null;
    }

    console.log('Default settings created:', data);
    return data;
  } catch (error) {
    console.error('Error creating default settings:', error);
    return null;
  }
};

export const updateCalendarSettings = async (
  calendarId: string, 
  updates: Partial<CalendarSettings>
): Promise<boolean> => {
  try {
    console.log('Saving calendar settings changes:', updates);

    const { error } = await supabase
      .from('calendar_settings')
      .update(updates)
      .eq('calendar_id', calendarId);

    if (error) {
      console.error('Error saving calendar settings:', error);
      return false;
    }

    console.log('Settings saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving calendar settings:', error);
    return false;
  }
};

export const updateCalendarName = async (calendarId: string, newName: string): Promise<boolean> => {
  try {
    console.log('Updating calendar name to:', newName);

    const { error } = await supabase
      .from('calendars')
      .update({ name: newName })
      .eq('id', calendarId);

    if (error) {
      console.error('Error updating calendar name:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating calendar name:', error);
    return false;
  }
};
