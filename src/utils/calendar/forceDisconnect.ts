
/**
 * 🔥 FORCE DISCONNECT CALENDAR - Nuclear Option
 * =============================================
 * 
 * Deze utility forceert een complete, onherroepelijke disconnect van Google Calendar.
 * Geen caching, geen delays, geen fallbacks. Als de user "disconnect" klikt, is het WEG.
 */

import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

/**
 * 🚨 NUCLEAR DISCONNECT - Verwijdert ALLES gerelateerd aan calendar verbindingen
 * 
 * WHAT IT DOES:
 * 1. Forceert immediate delete van alle calendar_events
 * 2. Forceert immediate delete van alle calendar_connections  
 * 3. Zet setup_progress.calendar_linked = false
 * 4. Triggert immediate UI refresh
 * 5. Returnt alleen true als ALLES succesvol is verwijderd
 */
export const forceDisconnectAllCalendars = async (user: User): Promise<boolean> => {
  if (!user) {
    console.error('[ForceDisconnect] No user provided');
    return false;
  }

  console.log(`[ForceDisconnect] NUCLEAR DISCONNECT voor user: ${user.id}`);
  
  try {
    // 🔥 STEP 1: Delete ALL calendar events - geen mercy
    console.log('[ForceDisconnect] Deleting ALL calendar events...');
    const { error: eventsError } = await supabase
      .from('calendar_events')
      .delete()
      .eq('user_id', user.id);

    if (eventsError) {
      console.error('[ForceDisconnect] FAILED to delete calendar events:', eventsError);
      throw new Error(`Calendar events delete failed: ${eventsError.message}`);
    }
    console.log('[ForceDisconnect] ✅ ALL calendar events DELETED');

    // 🔥 STEP 2: Delete ALL calendar connections - geen mercy
    console.log('[ForceDisconnect] Deleting ALL calendar connections...');
    const { error: connectionsError } = await supabase
      .from('calendar_connections')
      .delete()
      .eq('user_id', user.id);

    if (connectionsError) {
      console.error('[ForceDisconnect] FAILED to delete calendar connections:', connectionsError);
      throw new Error(`Calendar connections delete failed: ${connectionsError.message}`);
    }
    console.log('[ForceDisconnect] ✅ ALL calendar connections DELETED');

    // 🔥 STEP 3: Force setup progress update
    console.log('[ForceDisconnect] Forcing setup_progress update...');
    const { error: progressError } = await supabase
      .from('setup_progress')
      .update({
        calendar_linked: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (progressError) {
      console.error('[ForceDisconnect] FAILED to update setup progress:', progressError);
      throw new Error(`Setup progress update failed: ${progressError.message}`);
    }
    console.log('[ForceDisconnect] ✅ Setup progress FORCED to calendar_linked = false');

    // 🔥 STEP 4: Verification - controleer of alles echt weg is
    console.log('[ForceDisconnect] Verifying complete deletion...');
    
    const { data: remainingEvents } = await supabase
      .from('calendar_events')
      .select('id')
      .eq('user_id', user.id);

    const { data: remainingConnections } = await supabase
      .from('calendar_connections')
      .select('id')
      .eq('user_id', user.id);

    if (remainingEvents && remainingEvents.length > 0) {
      console.error('[ForceDisconnect] VERIFICATION FAILED - Events still exist:', remainingEvents.length);
      throw new Error(`Verification failed: ${remainingEvents.length} calendar events still exist`);
    }

    if (remainingConnections && remainingConnections.length > 0) {
      console.error('[ForceDisconnect] VERIFICATION FAILED - Connections still exist:', remainingConnections.length);
      throw new Error(`Verification failed: ${remainingConnections.length} calendar connections still exist`);
    }

    console.log('[ForceDisconnect] 🎉 NUCLEAR DISCONNECT COMPLETED SUCCESSFULLY');
    console.log('[ForceDisconnect] - 0 calendar events remaining');
    console.log('[ForceDisconnect] - 0 calendar connections remaining');
    console.log('[ForceDisconnect] - setup_progress.calendar_linked = false');
    
    return true;

  } catch (error) {
    console.error('[ForceDisconnect] NUCLEAR DISCONNECT FAILED:', error);
    return false;
  }
};

/**
 * 🔥 IMMEDIATE UI REFRESH - Forceert browser refresh na disconnect
 */
export const forceUIRefresh = () => {
  console.log('[ForceDisconnect] Forcing immediate UI refresh...');
  
  // Force een complete page reload om alle cached state te clearen
  setTimeout(() => {
    window.location.reload();
  }, 500);
};
