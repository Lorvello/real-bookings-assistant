
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, AlertTriangle, RefreshCw } from 'lucide-react';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { useAuth } from '@/hooks/useAuth';
import { CalendarIntegrationModal } from '@/components/CalendarIntegrationModal';
import { useToast } from '@/hooks/use-toast';
import { CalendarConnectionManager } from '@/components/calendar/CalendarConnectionManager';

/**
 * 📅 CALENDAR MANAGEMENT CARD - Enhanced Dashboard Widget
 * ======================================================
 * 
 * 🎯 AFFABLE BOT CONTEXT:
 * Upgraded dashboard card voor comprehensive calendar connection management.
 * Integreert de nieuwe DisconnectCalendarButton functionaliteit met bestaande
 * sync en connection management features.
 * 
 * 🚀 NEW FEATURES:
 * - Integrated disconnect functionality met confirmation
 * - Improved connection status visualization
 * - Enhanced user feedback en error handling
 * - Streamlined management interface
 * 
 * 🎪 SYSTEM INTEGRATION:
 * - Dashboard: Primary calendar management widget
 * - Setup Progress: Automatic updates na connection changes
 * - Calendar Sync: Manual sync triggers
 * - WhatsApp Bot: Dependency op active connections
 */

export const CalendarManagementCard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  
  const {
    connections,
    loading,
    syncCalendarEvents,
    syncing,
    refetch
  } = useCalendarIntegration(user);

  /**
   * 🔄 Handles manual calendar sync with user feedback
   */
  const handleSync = async () => {
    console.log('[CalendarManagement] Starting manual sync');
    
    try {
      const success = await syncCalendarEvents();
      if (success) {
        toast({
          title: "Kalender Gesynchroniseerd",
          description: "Je kalender events zijn bijgewerkt",
        });
        await refetch();
      }
    } catch (error) {
      console.error('[CalendarManagement] Error during sync:', error);
      toast({
        title: "Sync Mislukt",
        description: "Er ging iets mis tijdens het synchroniseren",
        variant: "destructive",
      });
    }
  };

  /**
   * 🎯 Handles successful calendar integration completion
   */
  const handleCalendarIntegrationComplete = () => {
    console.log('[CalendarManagement] Calendar integration completed');
    setShowCalendarModal(false);
    
    setTimeout(() => {
      toast({
        title: "Kalender Verbonden",
        description: "Je kalender is succesvol verbonden en wordt gesynchroniseerd",
      });
      refetch();
    }, 1000);
  };

  /**
   * 🆕 Opens calendar selection modal voor nieuwe verbindingen
   */
  const handleNewCalendarConnect = () => {
    console.log('[CalendarManagement] Opening calendar selection modal');
    setShowCalendarModal(true);
  };

  /**
   * 🔄 Handles refresh after connection changes (zoals disconnect)
   */
  const handleConnectionRefresh = async () => {
    console.log('[CalendarManagement] Refreshing connections after change');
    await refetch();
  };

  // 🔄 LOADING STATE
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-green-600" />
            Kalender Beheer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-green-600" />
            <div className="text-sm text-gray-600">Kalender verbindingen laden...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* 🎨 MAIN CALENDAR MANAGEMENT INTERFACE */}
      <CalendarConnectionManager
        user={user}
        connections={connections}
        loading={loading || syncing}
        onRefresh={handleConnectionRefresh}
        onAddCalendar={handleNewCalendarConnect}
      />

      {/* 📅 CALENDAR INTEGRATION MODAL */}
      <CalendarIntegrationModal
        open={showCalendarModal}
        onOpenChange={setShowCalendarModal}
        onComplete={handleCalendarIntegrationComplete}
      />
    </>
  );
};

/**
 * 🎯 AFFABLE BOT SYSTEM NOTES:
 * ============================
 * 
 * Deze enhanced CalendarManagementCard biedt now volledige calendar connection
 * management inclusief de nieuwe disconnect functionaliteit. Het is een kritieke
 * component voor het onderhouden van het autonome booking systeem.
 * 
 * KEY IMPROVEMENTS:
 * - Integrated disconnect buttons met proper confirmation
 * - Enhanced visual feedback en status indicators
 * - Streamlined management interface
 * - Better error handling en user guidance
 * 
 * BUSINESS IMPACT:
 * - Reduced support tickets door clear management interface
 * - Quick troubleshooting van connection issues
 * - Improved user confidence in system reliability
 * - Faster resolution van sync problems
 * 
 * SYSTEM DEPENDENCIES:
 * - CalendarConnectionManager: New management interface
 * - DisconnectCalendarButton: Safe disconnect functionality
 * - useCalendarIntegration: Connection state management
 * - Calendar Sync: Manual sync capabilities
 */
