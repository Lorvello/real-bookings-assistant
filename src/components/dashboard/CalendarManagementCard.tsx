
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, RefreshCw, Unlink, AlertTriangle } from 'lucide-react';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { useAuth } from '@/hooks/useAuth';
import { CalendarIntegrationModal } from '@/components/CalendarIntegrationModal';
import { useToast } from '@/hooks/use-toast';
import { CalendarConnectionManager } from '@/components/calendar/CalendarConnectionManager';
import { CalcomProviderCard } from '@/components/calendar/CalcomProviderCard';
import { disconnectAllCalendarConnections } from '@/utils/calendar/connectionDisconnect';

export const CalendarManagementCard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [disconnectingAll, setDisconnectingAll] = useState(false);
  
  const {
    connections,
    loading,
    syncCalendarEvents,
    syncing,
    refetch,
    isProviderConnected
  } = useCalendarIntegration(user);

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

  const handleDisconnectAll = async () => {
    if (!user) return;
    
    setDisconnectingAll(true);
    console.log('[CalendarManagement] Disconnecting all calendar connections');
    
    try {
      const success = await disconnectAllCalendarConnections(user);
      
      if (success) {
        toast({
          title: "Alle Kalenders Ontkoppeld",
          description: "Alle kalender verbindingen zijn succesvol verwijderd",
        });
        
        // Refresh na disconnect
        setTimeout(() => {
          refetch();
        }, 1000);
      } else {
        toast({
          title: "Disconnect Mislukt",
          description: "Er ging iets mis bij het ontkoppelen van de kalenders",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('[CalendarManagement] Error during disconnect all:', error);
      toast({
        title: "Disconnect Fout",
        description: "Er trad een onverwachte fout op",
        variant: "destructive",
      });
    } finally {
      setDisconnectingAll(false);
    }
  };

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

  const handleNewCalendarConnect = () => {
    console.log('[CalendarManagement] Opening calendar selection modal');
    setShowCalendarModal(true);
  };

  const handleConnectionRefresh = async () => {
    console.log('[CalendarManagement] Refreshing connections after change');
    await refetch();
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
            {connections.length > 0 && (
              <Badge variant="outline" className="ml-auto">
                {connections.length} verbonden
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cal.com Provider Card */}
          <CalcomProviderCard
            isConnected={isProviderConnected('calcom')}
            onRefresh={handleConnectionRefresh}
          />

          {/* Disconnect All Warning & Button */}
          {connections.length > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <div className="flex items-center justify-between">
                  <span>Wil je alle kalender verbindingen verwijderen?</span>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleDisconnectAll}
                    disabled={disconnectingAll}
                    className="ml-4"
                  >
                    {disconnectingAll ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                        Ontkoppelen...
                      </>
                    ) : (
                      <>
                        <Unlink className="h-4 w-4 mr-1" />
                        Alle Kalenders Ontkoppelen
                      </>
                    )}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <CalendarConnectionManager
            user={user}
            connections={connections}
            loading={loading || syncing}
            onRefresh={handleConnectionRefresh}
            onAddCalendar={handleNewCalendarConnect}
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
