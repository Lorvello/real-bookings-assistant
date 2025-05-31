
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
    const success = await disconnectProvider(connectionId);
    if (success) {
      toast({
        title: "Calendar Disconnected",
        description: `${providerName} calendar has been disconnected successfully`,
      });
      refetch();
    }
  };

  const handleSync = async () => {
    const success = await syncCalendarEvents();
    if (success) {
      toast({
        title: "Calendar Synced",
        description: "Your calendar events have been synchronized",
      });
    }
  };

  const handleCalendarIntegrationComplete = () => {
    setShowCalendarModal(false);
    refetch();
    toast({
      title: "Calendar Connected",
      description: "Your calendar has been connected successfully",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-green-600" />
            Calendar Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading calendar connections...</div>
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
            Calendar Management
            <Badge variant="outline" className="ml-auto">
              {connections.length} connected
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {connections.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No calendar connections found. Connect your calendar to start receiving bookings.
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
                        {connection.provider} Calendar
                      </div>
                      <div className="text-sm text-green-700">
                        Connected on {new Date(connection.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisconnect(connection.id, connection.provider)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Unlink className="h-4 w-4 mr-1" />
                    Disconnect
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
              Connect New Calendar
            </Button>
            {connections.length > 0 && (
              <Button
                variant="outline"
                onClick={handleSync}
                disabled={syncing}
              >
                {syncing ? 'Syncing...' : 'Sync Now'}
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
