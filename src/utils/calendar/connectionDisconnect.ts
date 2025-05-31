
/**
 * 🔌 CALENDAR CONNECTION DISCONNECT UTILITIES
 * ============================================
 * 
 * 🎯 AFFABLE BOT CONTEXT:
 * Dit bestand beheert het ontkoppelen van externe kalender verbindingen (Google, Microsoft).
 * Het is onderdeel van het autonome booking systeem waarbij kalendersynchronisatie
 * de kern vormt van realtime beschikbaarheidscontrole voor de WhatsApp bot.
 * 
 * 🔄 BUSINESS LOGIC:
 * - Wanneer gebruikers hun kalender ontkoppelen, moeten alle gerelateerde data worden opgeschoond
 * - Calendar events (lokale cache) worden verwijderd om inconsistenties te voorkomen  
 * - Setup progress wordt gereset om gebruiker opnieuw door onboarding te leiden
 * - Dit zorgt voor een schone staat wanneer gebruikers opnieuw verbinding willen maken
 * 
 * 🎪 SYSTEM IMPACT:
 * - Na disconnect kan WhatsApp bot GEEN beschikbaarheid meer controleren
 * - Dashboard toont "Action Required" totdat nieuwe verbinding wordt gemaakt
 * - Autonome booking functionaliteit wordt uitgeschakeld tot reconnect
 * 
 * 💡 SUCCESS METRICS IMPACT:
 * - Disconnect/reconnect flow moet < 3 minuten duren voor 100% activatie target
 * - Foutloze disconnect voorkomt support tickets (< 5% per maand target)
 */

import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

/**
 * 🔌 Ontkoppelt een specifieke kalender provider verbinding
 * 
 * WORKFLOW:
 * 1. Verwijder alle calendar_events voor deze connection (lokale cache cleanup)
 * 2. Verwijder de calendar_connection zelf (OAuth tokens worden weggegooid)  
 * 3. Check of er nog andere actieve verbindingen zijn
 * 4. Update setup_progress.calendar_linked naar false als geen verbindingen meer
 * 
 * @param user - Authenticated user object voor RLS security
 * @param connectionId - Specific connection ID to disconnect
 * @returns Promise<boolean> - Success status voor UI feedback
 */
export const disconnectCalendarProvider = async (user: User, connectionId: string): Promise<boolean> => {
  if (!user) {
    console.error('[CalendarDisconnect] No user provided');
    return false;
  }

  try {
    console.log(`[CalendarDisconnect] Starting disconnect for connection: ${connectionId}`);
    
    // 🧹 STEP 1: Clear all calendar events for this connection
    // Dit voorkomt orphaned calendar events die beschikbaarheid zouden verstoren
    const { error: eventsError } = await supabase
      .from('calendar_events')
      .delete()
      .eq('calendar_connection_id', connectionId)
      .eq('user_id', user.id);

    if (eventsError) {
      console.error('[CalendarDisconnect] Error clearing calendar events:', eventsError);
      // Continue anyway - events kunnen al weg zijn door eerdere cleanup
    }

    // 🗑️ STEP 2: Delete the connection itself
    // OAuth tokens worden hiermee onbruikbaar gemaakt voor security
    const { error: deleteError } = await supabase
      .from('calendar_connections')
      .delete()
      .eq('id', connectionId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('[CalendarDisconnect] Error deleting connection:', deleteError);
      return false;
    }

    console.log('[CalendarDisconnect] Connection successfully deleted');

    // 🔍 STEP 3: Check for remaining active connections
    // Belangrijk voor multi-provider support (Google + Microsoft tegelijk)
    const { data: remainingConnections, error: checkError } = await supabase
      .from('calendar_connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (checkError) {
      console.error('[CalendarDisconnect] Error checking remaining connections:', checkError);
      // Continue anyway - setup progress update is niet kritiek
    }

    const hasRemainingConnections = remainingConnections && remainingConnections.length > 0;
    console.log(`[CalendarDisconnect] Remaining connections: ${hasRemainingConnections ? remainingConnections.length : 0}`);

    // 📊 STEP 4: Update setup progress if no connections remain
    // Dit triggert dashboard "Action Required" sectie om re-onboarding te starten
    if (!hasRemainingConnections) {
      const { error: progressError } = await supabase
        .from('setup_progress')
        .update({
          calendar_linked: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (progressError) {
        console.error('[CalendarDisconnect] Error updating setup progress:', progressError);
        // Don't fail the disconnect for this - user experience blijft intact
      } else {
        console.log('[CalendarDisconnect] Setup progress updated - calendar_linked set to false');
      }
    }

    return true;
  } catch (error) {
    console.error('[CalendarDisconnect] Unexpected error:', error);
    return false;
  }
};

/**
 * 🔥 Ontkoppelt ALLE kalender verbindingen voor een gebruiker
 * 
 * USE CASES:
 * - "Reset Calendar" functionaliteit in dashboard
 * - Account cleanup bij problemen
 * - Volledige re-onboarding scenario
 * 
 * BUSINESS IMPACT:
 * - WhatsApp bot wordt volledig uitgeschakeld tot nieuwe setup
 * - Alle bestaande appointments blijven behouden (data integriteit)
 * - Setup progress wordt gereset voor guided re-onboarding
 * 
 * @param user - Authenticated user voor security en RLS
 * @returns Promise<boolean> - Success status voor UI feedback
 */
export const disconnectAllCalendarConnections = async (user: User): Promise<boolean> => {
  if (!user) {
    console.error('[CalendarDisconnect] No user provided for disconnect all');
    return false;
  }

  try {
    console.log(`[CalendarDisconnect] Starting disconnect ALL for user: ${user.id}`);
    
    // 📋 STEP 1: Fetch all active connections voor batch processing
    const { data: connections, error: fetchError } = await supabase
      .from('calendar_connections')
      .select('id, provider')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (fetchError) {
      console.error('[CalendarDisconnect] Error fetching connections:', fetchError);
      return false;
    }

    if (!connections || connections.length === 0) {
      console.log('[CalendarDisconnect] No active connections to disconnect');
      
      // 🔄 Ensure setup progress is correct even if no connections found
      // Edge case: data inconsistency waarbij setup_progress nog true is
      const { error: progressError } = await supabase
        .from('setup_progress')
        .update({
          calendar_linked: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (progressError) {
        console.error('[CalendarDisconnect] Error updating setup progress:', progressError);
      }
      
      return true;
    }

    console.log(`[CalendarDisconnect] Found ${connections.length} connections to disconnect`);

    // 🔁 STEP 2: Disconnect alle connections één voor één
    // Sequential processing voor betere error handling en logging
    let allSuccess = true;
    for (const connection of connections) {
      console.log(`[CalendarDisconnect] Disconnecting ${connection.provider} connection: ${connection.id}`);
      const success = await disconnectCalendarProvider(user, connection.id);
      if (!success) {
        console.error(`[CalendarDisconnect] Failed to disconnect ${connection.provider}: ${connection.id}`);
        allSuccess = false;
      }
    }

    // 🎯 STEP 3: Force update setup progress ongeacht individuele resultaten
    // Belangrijk: ook bij partial failures moet UI consistent blijven
    const { error: finalProgressError } = await supabase
      .from('setup_progress')
      .update({
        calendar_linked: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (finalProgressError) {
      console.error('[CalendarDisconnect] Error in final setup progress update:', finalProgressError);
    }

    console.log(`[CalendarDisconnect] Disconnect all completed. Success: ${allSuccess}`);
    return allSuccess;
  } catch (error) {
    console.error('[CalendarDisconnect] Unexpected error in disconnect all:', error);
    return false;
  }
};

/**
 * 🎯 AFFABLE BOT SYSTEM NOTES:
 * ============================
 * 
 * Dit bestand is cruciaal voor het onderhouden van data integriteit in het autonome booking systeem.
 * Wanneer kalender verbindingen worden verbroken, moet het systeem gracieus degraderen naar een
 * "setup required" staat in plaats van in een inconsistente toestand te blijven.
 * 
 * KEY PRINCIPLES:
 * - Fail gracefully: partial failures mogen niet het hele disconnect proces blokkeren
 * - Data consistency: calendar_events en calendar_connections moeten altijd synchroon zijn
 * - User experience: disconnect moet leiden naar duidelijke re-onboarding guidance
 * - Security: OAuth tokens moeten volledig worden weggegooid bij disconnect
 * 
 * INTEGRATION POINTS:
 * - Dashboard SetupProgressCard: gebruikt setup_progress.calendar_linked voor UI state
 * - WhatsApp Bot: kan niet functioneren zonder actieve calendar_connections
 * - Calendar Sync Functions: respecteren is_active flag voor sync operations
 * - Business Metrics: disconnects kunnen appointment volume beïnvloeden
 */
