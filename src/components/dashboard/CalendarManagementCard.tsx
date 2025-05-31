
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, AlertTriangle, RefreshCw } from 'lucide-react';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { useAuth } from '@/hooks/useAuth';
import { CalendarIntegrationModal } from '@/components/CalendarIntegrationModal';
import { useToast } from '@/hooks/use-toast';
import { CalendarConnectionItem } from './CalendarConnectionItem';
import { CalendarManagementActions } from './CalendarManagementActions';
import { disconnectCalendarProvider } from '@/utils/calendar/connectionDisconnect';

export const CalendarManagementCard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  
  const {
    connections,
    loading,
    syncCalendarEvents,
    syncing,
    refetch
  } = useCalendarIntegration(user);

  const handleDisconnect = async (connectionId: string, providerName: string) => {
    if (!user) {
      console.error('[CalendarManagement] No user available for disconnect');
      return;
    }

    console.log(`[CalendarManagement] Starting disconnect for: ${connectionId} (${providerName})`);
    setDisconnecting(connectionId);
    
    try {
      const success = await disconnectCalendarProvider(user, connectionId);
      
      if (success) {
        toast({
          title: "Kalender Ontkoppeld",
          description: `${providerName} kalender is succesvol ontkoppeld`,
        });
        
        // Refresh de connections na een korte delay
        setTimeout(async () => {
          console.log('[CalendarManagement] Refreshing connections after disconnect');
          await refetch();
        }, 1000);
      } else {
        toast({
          title: "Fout bij Ontkoppelen", 
          description: `Kon ${providerName} kalender niet ontkoppelen. Probeer het opnieuw.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('[CalendarManagement] Error during disconnect:', error);
      toast({
        title: "Fout bij Ontkoppelen",
        description: `Er ging iets mis bij het ontkoppelen van ${providerName}. Probeer het opnieuw.`,
        variant: "destructive",
      });
    } finally {
      setDisconnecting(null);
    }
  };

  const handleSync = async () => {
    console.log('[CalendarManagement] Starting manual sync');
    
    try {
      const success = await syncCalendarEvents();
      if (success) {
        toast({
          title: "Kalender Gesynchroniseerd",
          description: "Je kalender events zijn gesynchroniseerd",
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

  const handleCalendarIntegrationComplete = () => {
    console.log('[CalendarManagement] Calendar integration completed');
    setShowCalendarModal(false);
    
    setTimeout(() => {
      toast({
        title: "Kalender Verbonden",
        description: "Je kalender is succesvol verbonden",
      });
      refetch();
    }, 1000);
  };

  const handleNewCalendarConnect = () => {
    console.log('[CalendarManagement] Opening calendar selection modal');
    setShowCalendarModal(true);
  };

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-green-600" />
            Kalender Beheer
            <Badge variant="outline" className="ml-auto">
              {connections.length} verbonden
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {connections.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Geen kalender verbindingen gevonden. Verbind je kalender om afspraken te ontvangen.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {connections.map((connection) => (
                <CalendarConnectionItem
                  key={connection.id}
                  connection={connection}
                  disconnecting={disconnecting === connection.id}
                  onDisconnect={handleDisconnect}
                />
              ))}
            </div>
          )}

          <CalendarManagementActions
            hasConnections={connections.length > 0}
            syncing={syncing}
            loading={loading}
            onNewCalendarConnect={handleNewCalendarConnect}
            onSync={handleSync}
          />
        </CardContent>
      </Card>

      <CalendarIntegrationModal
        open={showCalendarModal}
        onOpenChange={setShowCalendarModal}
        onComplete={handleCalendarIntegrationComplete}
      />
    </>
  );
};
