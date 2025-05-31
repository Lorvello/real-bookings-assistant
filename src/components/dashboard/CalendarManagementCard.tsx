
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, CheckCircle, Unlink, AlertTriangle, RefreshCw } from 'lucide-react';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { useAuth } from '@/hooks/useAuth';
import { CalendarIntegrationModal } from '@/components/CalendarIntegrationModal';
import { useToast } from '@/hooks/use-toast';

export const CalendarManagementCard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  
  const {
    connections,
    loading,
    disconnectProvider,
    syncCalendarEvents,
    syncing,
    refetch
  } = useCalendarIntegration(user);

  const handleDisconnect = async (connectionId: string, providerName: string) => {
    console.log('[CalendarManagement] Starting disconnect for:', connectionId, providerName);
    setDisconnecting(connectionId);
    
    try {
      const success = await disconnectProvider(connectionId);
      
      if (success) {
        toast({
          title: "Kalender Ontkoppeld",
          description: `${providerName} kalender is succesvol ontkoppeld`,
        });
        
        // Refresh the connections list after successful disconnect
        console.log('[CalendarManagement] Refreshing connections after disconnect');
        await refetch();
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
        
        // Refresh connections after sync
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
    
    // Refresh connections after new integration
    setTimeout(async () => {
      await refetch();
      toast({
        title: "Kalender Verbonden",
        description: "Je kalender is succesvol verbonden",
      });
    }, 1000);
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
                <div
                  key={connection.id}
                  className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium text-green-900 capitalize">
                        {connection.provider} Kalender
                      </div>
                      <div className="text-sm text-green-700">
                        Verbonden op {new Date(connection.created_at).toLocaleDateString('nl-NL')}
                      </div>
                      {connection.provider_account_id !== 'pending' && (
                        <div className="text-xs text-green-600">
                          Account: {connection.provider_account_id}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisconnect(connection.id, connection.provider)}
                    disabled={disconnecting === connection.id}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {disconnecting === connection.id ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                        Ontkoppelen...
                      </>
                    ) : (
                      <>
                        <Unlink className="h-4 w-4 mr-1" />
                        Ontkoppelen
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={() => setShowCalendarModal(true)}
              className="flex-1"
              disabled={loading}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Nieuwe Kalender Verbinden
            </Button>
            {connections.length > 0 && (
              <Button
                variant="outline"
                onClick={handleSync}
                disabled={syncing || loading}
              >
                {syncing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    Synchroniseren...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Nu Synchroniseren
                  </>
                )}
              </Button>
            )}
          </div>
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
