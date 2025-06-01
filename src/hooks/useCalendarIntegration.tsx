
/**
 * 🔗 CALENDAR INTEGRATION HOOK
 * ============================
 * 
 * 🎯 AFFABLE BOT CONTEXT:
 * Deze hook beheert de volledige levenscyclus van externe kalender integraties.
 * Het is de bridge tussen de frontend UI en de backend kalender synchronisatie,
 * en vormt de ruggengraat van het autonome booking systeem.
 * 
 * 🚀 BUSINESS CRITICAL FUNCTIONS:
 * - Real-time connection status monitoring voor dashboard widgets
 * - Calendar sync triggering voor beschikbaarheid updates  
 * - Connection management voor multi-provider ondersteuning
 * - Error handling en user feedback voor seamless UX
 * 
 * 🎪 SYSTEM INTEGRATION:
 * - Dashboard components gebruiken deze hook voor live connection status
 * - Setup wizards triggeren actions via deze hook voor guided onboarding
 * - Calendar sync wordt getriggerd vanuit deze hook na successful connections
 * - WhatsApp bot afhankelijkheid: zonder actieve connections geen booking mogelijk
 * 
 * 💡 SUCCESS METRICS CONTRIBUTION:
 * - Snelle sync (< 30 sec) draagt bij aan 100% activatie binnen 3 minuten
 * - Foutloze disconnect/reconnect voorkomt support tickets
 * - Real-time status updates verbeteren user experience en engagement
 */

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { CalendarIntegrationState } from '@/types/calendar';
import { fetchCalendarConnections } from '@/utils/calendar/connectionManager';
import { disconnectCalendarProvider } from '@/utils/calendar/connectionDisconnect';
import { syncCalendarEvents } from '@/utils/calendarSync';

/**
 * 🎮 Primary hook voor calendar integration management
 * 
 * RESPONSIBILITIES:
 * - Connection state management (loading, syncing, error states)
 * - Real-time connection fetching en caching
 * - Provider disconnect orchestration met cleanup
 * - Calendar sync triggering voor beschikbaarheid updates
 * - Error handling en user feedback via toast notifications
 * 
 * @param user - Authenticated user object voor RLS en API calls
 * @returns Object met connection state, actions en utility functions
 */
export const useCalendarIntegration = (user: User | null) => {
  // 📊 STATE MANAGEMENT
  // Centralized state voor alle calendar integration aspecten
  const [state, setState] = useState<CalendarIntegrationState>({
    connections: [],          // Lijst van actieve connections
    loading: true,           // Initial loading state voor skeleton UI
    syncing: false,          // Active sync in progress voor loading indicators  
    connectionStatus: 'idle', // Connection establishment status
    errorMessage: ''         // User-friendly error messages voor toast display
  });
  
  const { toast } = useToast();

  // 🔄 EFFECT: Auto-fetch connections on user change
  // Triggert wanneer user inlogt/uitlogt of component mount
  useEffect(() => {
    if (user) {
      console.log('[useCalendarIntegration] User detected, fetching connections for:', user.id);
      fetchConnections();
    } else {
      console.log('[useCalendarIntegration] No user, clearing state');
      // Clear state when user logs out voor security
      setState(prev => ({ ...prev, connections: [], loading: false }));
    }
  }, [user]);

  /**
   * 📡 Fetcht alle calendar connections voor de huidige user
   * 
   * INTEGRATION POINTS:
   * - Called na successful OAuth flows
   * - Called na disconnect operations voor state refresh  
   * - Called periodically door components voor live updates
   * 
   * ERROR HANDLING:
   * - Toast notifications voor user feedback
   * - Graceful degradation bij API failures
   * - Loading state management voor smooth UX
   */
  const fetchConnections = async () => {
    if (!user) {
      console.log('[useCalendarIntegration] fetchConnections called but no user available');
      return;
    }

    try {
      console.log('[CalendarIntegration] Starting fetch for user:', user.id);
      setState(prev => ({ ...prev, loading: true }));
      
      // 🔍 Fetch via utility function die RLS en filters afhandelt
      const connections = await fetchCalendarConnections(user);
      console.log('[CalendarIntegration] Fetched connections:', {
        count: connections.length,
        connections: connections.map(c => ({ id: c.id, provider: c.provider, is_active: c.is_active }))
      });
      
      // ✅ Update state met fresh data
      setState(prev => ({ 
        ...prev, 
        connections, 
        loading: false,
        errorMessage: ''
      }));
    } catch (error) {
      console.error('[CalendarIntegration] Error fetching connections:', error);
      
      // 🚨 User feedback via toast system
      toast({
        title: "Error",
        description: "Failed to fetch calendar connections",
        variant: "destructive",
      });
      
      // 🔄 Ensure loading state is cleared ook bij errors
      setState(prev => ({ 
        ...prev, 
        loading: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  /**
   * 🔌 Disconnect een specifieke calendar provider
   * 
   * BUSINESS LOGIC:
   * - Triggert volledige cleanup van connection + events
   * - Refresht connection list voor immediate UI feedback
   * - Gebruikt uitgebreide error handling voor user guidance
   * 
   * DASHBOARD INTEGRATION:
   * - Called vanuit CalendarManagementCard disconnect buttons
   * - Called vanuit SetupProgressCard reset functionaliteit
   * - Success/failure wordt getoond via toast notifications
   * 
   * @param connectionId - Unique ID van de te verwijderen connection
   * @returns Promise<boolean> - Success status voor calling component
   */
  const disconnectProvider = async (connectionId: string): Promise<boolean> => {
    if (!user) {
      console.error('[CalendarIntegration] No user for disconnect');
      return false;
    }

    try {
      console.log('[CalendarIntegration] Disconnecting provider:', connectionId);
      
      // 🔥 Execute disconnect via utility function
      const success = await disconnectCalendarProvider(user, connectionId);
      
      if (success) {
        console.log('[CalendarIntegration] Disconnect successful, refreshing connections');
        // 🔄 Immediate refresh voor UI consistency
        await fetchConnections();
      } else {
        console.error('[CalendarIntegration] Disconnect failed');
      }

      return success;
    } catch (error) {
      console.error('[CalendarIntegration] Error in disconnectProvider:', error);
      return false;
    }
  };

  /**
   * 🔄 Triggert manual calendar sync voor alle actieve connections
   * 
   * USE CASES:
   * - "Refresh" button in dashboard voor immediate sync
   * - Post-connection setup voor initial event loading
   * - Recovery van sync failures of inconsistencies
   * 
   * BUSINESS IMPACT:
   * - Updates lokale calendar_events cache
   * - Zorgt voor accurate beschikbaarheid voor WhatsApp bot
   * - Voorkomt dubbele boekingen door stale data
   * 
   * @returns Promise<boolean> - Success status voor UI feedback
   */
  const handleSyncCalendarEvents = async (): Promise<boolean> => {
    if (!user) return false;

    // 🔄 Set syncing state voor loading indicators
    setState(prev => ({ ...prev, syncing: true }));

    try {
      console.log('[CalendarIntegration] Starting calendar sync');
      
      // 🚀 Execute sync via centralized utility
      await syncCalendarEvents(user);
      
      console.log('[CalendarIntegration] Calendar sync completed successfully');
      setState(prev => ({ ...prev, syncing: false }));
      return true;
    } catch (error) {
      console.error('[CalendarIntegration] Calendar sync failed:', error);
      setState(prev => ({ ...prev, syncing: false }));
      return false;
    }
  };

  /**
   * 🔍 Utility: Find connection by provider name
   * 
   * USAGE:
   * - Check if specific provider (google/microsoft) is connected
   * - Get connection details voor provider-specific operations
   * - Conditional rendering based on provider availability
   * 
   * @param provider - Provider name (google/microsoft/apple)
   * @returns CalendarConnection object or undefined
   */
  const getConnectionByProvider = (provider: string) => {
    return state.connections.find(conn => conn.provider === provider);
  };

  /**
   * 🔍 Utility: Check if provider is actively connected
   * 
   * USAGE:
   * - Dashboard conditionals voor connect/disconnect buttons
   * - Setup progress validation voor onboarding flow
   * - Feature availability checks voor provider-specific functions
   * 
   * @param provider - Provider name to check
   * @returns boolean - True if provider is connected and active
   */
  const isProviderConnected = (provider: string) => {
    return state.connections.some(conn => conn.provider === provider && conn.is_active);
  };

  // 🎯 HOOK RETURN INTERFACE
  // Comprehensive API voor consuming components
  return {
    // 📊 STATE PROPERTIES
    connections: state.connections,           // Array van actieve connections
    loading: state.loading,                  // Initial loading indicator
    syncing: state.syncing,                  // Sync operation in progress
    connectionStatus: state.connectionStatus, // Connection establishment status
    errorMessage: state.errorMessage,        // User-friendly error messages
    
    // 🔧 ACTION METHODS  
    disconnectProvider,                      // Disconnect specific provider
    syncCalendarEvents: handleSyncCalendarEvents, // Manual sync trigger
    refetch: fetchConnections,               // Refresh connections list
    
    // 🔍 UTILITY METHODS
    getConnectionByProvider,                 // Find connection by provider
    isProviderConnected,                     // Check provider connection status
  };
};

/**
 * 🎯 AFFABLE BOT SYSTEM NOTES:
 * ============================
 * 
 * Deze hook is de centrale orchestrator voor alle calendar integratie functionaliteit.
 * Het vormt de bridge tussen de React frontend en de Supabase backend, en zorgt voor
 * realtime synchronisatie van kalender data die essentieel is voor het autonome booking systeem.
 * 
 * KEY SYSTEM INTERACTIONS:
 * - Dashboard: Real-time connection status en management interface
 * - Setup Wizard: Guided onboarding met automatic progress tracking  
 * - WhatsApp Bot: Afhankelijk van calendar_events data voor beschikbaarheid
 * - Business Metrics: Sync failures kunnen impact hebben op booking volume
 * 
 * CRITICAL SUCCESS FACTORS:
 * - Fast response times (< 2sec) voor immediate user feedback
 * - Reliable error handling om user frustration te voorkomen
 * - Consistent state management voor seamless UX across components
 * - Automatic recovery van temporary failures
 * 
 * BUSINESS VALUE:
 * - Enables volledig autonome 24/7 booking via WhatsApp
 * - Elimineert handmatige kalender management voor dienstverleners
 * - Voorkomt dubbele boekingen door realtime synchronisatie
 * - Verhoogt user engagement door instant availability updates
 */
