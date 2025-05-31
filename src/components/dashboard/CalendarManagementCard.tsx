
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, CheckCircle, Unlink, AlertTriangle } from 'lucide-react';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { useAuth } from '@/hooks/useAuth';
import { CalendarIntegrationModal } from '@/components/CalendarIntegrationModal';
import { useToast } from '@/hooks/use-toast';

export const CalendarManagementCard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  
  const {
    connections,
    loading,
    disconnectProvider,
    syncCalendarEvents,
    syncing,
    refetch
  } = useCalendarIntegration(user);

  const handleDisconnect = async (connectionId: string, providerName: string) => {
    console.log('[CalendarManagement] Disconnecting calendar:', connectionId, providerName);
    
    const success = await disconnectProvider(connectionId);
    if (success) {
      toast({
        title: "Kalender Ontkoppeld",
        description: `${providerName} kalender is succesvol ontkoppeld`,
      });
      // Refresh the connections list
      await refetch();
    } else {
      toast({
        title: "Fout bij Ontkoppelen",
        description: `Kon ${providerName} kalender niet ontkoppelen. Probeer het opnieuw.`,
        variant: "destructive",
      });
    }
  };

  const handleSync = async () => {
    console.log('[CalendarManagement] Starting manual sync');
    
    const success = await syncCalendarEvents();
    if (success) {
      toast({
        title: "Kalender Gesynchroniseerd",
        description: "Je kalender events zijn gesynchroniseerd",
      });
    }
  };

  const handleCalendarIntegrationComplete = () => {
    console.log('[CalendarManagement] Calendar integration completed');
    setShowCalendarModal(false);
    refetch();
    toast({
      title: "Kalender Verbonden",
      description: "Je kalender is succesvol verbonden",
    });
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
          <div className="text-center py-4">Kalender verbindingen laden...</div>
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
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisconnect(connection.id, connection.provider)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Unlink className="h-4 w-4 mr-1" />
                    Ontkoppelen
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={() => setShowCalendarModal(true)}
              className="flex-1"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Nieuwe Kalender Verbinden
            </Button>
            {connections.length > 0 && (
              <Button
                variant="outline"
                onClick={handleSync}
                disabled={syncing}
              >
                {syncing ? 'Synchroniseren...' : 'Nu Synchroniseren'}
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
