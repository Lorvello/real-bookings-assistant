
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

export const updateCalendarInfo = async (calendarId: string, updates: {
  name?: string;
  description?: string;
  color?: string;
}): Promise<boolean> => {
  try {
    console.log('Updating calendar info:', updates);

    const { error } = await supabase
      .from('calendars')
      .update(updates)
      .eq('id', calendarId);

    if (error) {
      console.error('Error updating calendar info:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating calendar info:', error);
    return false;
  }
};

// Fetch service types linked to a calendar
export const fetchCalendarServiceTypes = async (calendarId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('calendar_service_types')
      .select('service_type_id')
      .eq('calendar_id', calendarId);

    if (error) {
      console.error('Error fetching calendar service types:', error);
      return [];
    }

    return data?.map(item => item.service_type_id) || [];
  } catch (error) {
    console.error('Error fetching calendar service types:', error);
    return [];
  }
};

export const updateCalendarServiceTypes = async (calendarId: string, serviceTypeIds: string[]): Promise<boolean> => {
  try {
    console.log('Updating calendar service types:', serviceTypeIds);

    // First, remove all existing associations for this calendar
    const { error: deleteError } = await supabase
      .from('calendar_service_types')
      .delete()
      .eq('calendar_id', calendarId);

    if (deleteError) {
      console.error('Error removing existing service type associations:', deleteError);
      return false;
    }

    // Then, add new associations
    if (serviceTypeIds.length > 0) {
      const associations = serviceTypeIds.map(serviceTypeId => ({
        calendar_id: calendarId,
        service_type_id: serviceTypeId
      }));

      const { error: insertError } = await supabase
        .from('calendar_service_types')
        .insert(associations);

      if (insertError) {
        console.error('Error inserting service type associations:', insertError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error updating calendar service types:', error);
    return false;
  }
};

// Fetch calendar member IDs for a specific calendar
export const fetchCalendarMembers = async (calendarId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('calendar_members')
      .select('id')
      .eq('calendar_id', calendarId);

    if (error) {
      console.error('Error fetching calendar members:', error);
      return [];
    }

    return data?.map(item => item.id) || [];
  } catch (error) {
    console.error('Error fetching calendar members:', error);
    return [];
  }
};

export const updateCalendarMembers = async (calendarId: string, memberUserIds: string[]): Promise<boolean> => {
  try {
    console.log('Updating calendar members:', memberUserIds);

    // Get current members
    const { data: currentMembers, error: fetchError } = await supabase
      .from('calendar_members')
      .select('user_id')
      .eq('calendar_id', calendarId);

    if (fetchError) {
      console.error('Error fetching current members:', fetchError);
      return false;
    }

    const currentUserIds = currentMembers?.map(m => m.user_id) || [];
    
    // Find members to add and remove
    const membersToAdd = memberUserIds.filter(id => !currentUserIds.includes(id));
    const membersToRemove = currentUserIds.filter(id => !memberUserIds.includes(id));

    // Add new members
    if (membersToAdd.length > 0) {
      const newMembers = membersToAdd.map(userId => ({
        calendar_id: calendarId,
        user_id: userId,
        role: 'viewer' as const
      }));

      const { error: insertError } = await supabase
        .from('calendar_members')
        .insert(newMembers);

      if (insertError) {
        console.error('Error adding members:', insertError);
        return false;
      }
    }

    // Remove members
    if (membersToRemove.length > 0) {
      const { error: deleteError } = await supabase
        .from('calendar_members')
        .delete()
        .eq('calendar_id', calendarId)
        .in('user_id', membersToRemove);

      if (deleteError) {
        console.error('Error removing members:', deleteError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error updating calendar members:', error);
    return false;
  }
};
