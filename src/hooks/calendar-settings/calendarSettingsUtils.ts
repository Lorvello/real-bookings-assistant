
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
      // confirmation_required + allow_waitlist are INERT (ITEM 2, 2026-06-23): not honored by
      // the WhatsApp agent and not enforced anywhere. confirmation_required defaults to false
      // to match real instant-booking behavior (a true default was a landmine for a future
      // naive wiring). See migration 20260623120000_neutralize_orphaned_booking_flags.sql.
      calendar_id: calendarId,
      confirmation_required: false,
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

    // UPSERT on calendar_id: a plain .update() silently affects 0 rows (no error)
    // when the calendar_settings row is missing (legacy calendar / trigger miss) —
    // the UI would report success while nothing was saved. Upsert saves regardless.
    const { error } = await supabase
      .from('calendar_settings')
      .upsert({ calendar_id: calendarId, ...updates }, { onConflict: 'calendar_id' });

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

// LEGACY (IUX R55, EDITCALENDAR-SERVICETYPES-DUALTABLE): these two functions only ever read/wrote
// the calendar_service_types junction table, while the app's real source of truth for "which
// services does a calendar have" is service_types.calendar_id directly (see useServiceTypes.tsx's
// architecture comment + useCreateCalendar.tsx's bundled-service flow, which both use the direct
// column). EditCalendarDialog.tsx used to call these, causing it to show "0 services" for any
// calendar created via the normal flow. No longer called from EditCalendarDialog (see
// fetchServiceTypesByCalendarId / updateServiceTypesCalendarLink below); kept only because the
// junction table itself is out of scope to drop and some future code may still want it.
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

// Fetch service types linked to a calendar via the REAL source of truth (service_types.calendar_id
// directly). This is the same link useServiceTypes.tsx and useCreateCalendar.tsx use for every real
// booking/tax/checkout/WhatsApp-agent path (IUX R55, EDITCALENDAR-SERVICETYPES-DUALTABLE).
export const fetchServiceTypesByCalendarId = async (calendarId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('service_types')
      .select('id')
      .eq('calendar_id', calendarId)
      .or('is_deleted.is.null,is_deleted.eq.false');

    if (error) {
      console.error('Error fetching service types by calendar_id:', error);
      return [];
    }

    return data?.map(item => item.id) || [];
  } catch (error) {
    console.error('Error fetching service types by calendar_id:', error);
    return [];
  }
};

// Add service types to a calendar via the REAL source of truth (service_types.calendar_id).
// IUX R55 (EDITCALENDAR-SERVICETYPES-DUALTABLE): this is deliberately ADD-ONLY, it never sets
// calendar_id to null. Two independent reasons, both confirmed live against the real DB before
// shipping this fix:
//   1. RLS: service_types_owner_only_modify's WITH CHECK requires
//      `EXISTS (calendars WHERE calendars.id = service_types.calendar_id AND owner = auth.uid())`.
//      That EXISTS can never be true when calendar_id is NULL, so a client-side UPDATE that nulls
//      calendar_id is REJECTED by RLS outright (confirmed via a live repro: "Error unlinking
//      service types from calendar" console error, DB unchanged). Unlinking to NULL is not a
//      reachable state through the app's own client, by design of the policy.
//   2. Product model: every other real editing surface (Settings > Services, ServiceTypesManager.tsx)
//      already treats a service's calendar as a single-select "which calendar owns this service"
//      field, reassignable to a DIFFERENT calendar, never nulled out. There is no "orphan this
//      service from every calendar" operation anywhere in the app; the only ways to stop a service
//      belonging to a calendar are to reassign it elsewhere or soft-delete it (deleteServiceType).
// So this function only ever moves services INTO this calendar (covers both brand-new additions and
// re-confirming an already-linked service); it does not attempt to remove a service that gets
// deselected in the dialog, since there is no valid target state for that under RLS.
export const updateServiceTypesCalendarLink = async (calendarId: string, serviceTypeIds: string[]): Promise<boolean> => {
  try {
    console.log('Linking service_types.calendar_id for calendar:', calendarId, serviceTypeIds);

    if (serviceTypeIds.length === 0) {
      return true;
    }

    const { error: linkError } = await supabase
      .from('service_types')
      .update({ calendar_id: calendarId })
      .in('id', serviceTypeIds);

    if (linkError) {
      console.error('Error linking service types to calendar:', linkError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating service_types.calendar_id link:', error);
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
