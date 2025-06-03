
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const BookingStatusCard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    connections,
    loading,
    syncing,
    syncCalendarEvents,
    refetch,
    isCalcomConnected
  } = useCalendarIntegration(user);

  const handleSync = async () => {
    console.log('[BookingStatus] Starting manual sync');
    
    try {
      const success = await syncCalendarEvents();
      if (success) {
        toast({
          title: "Bookings Gesynchroniseerd",
          description: "Je Cal.com bookings zijn succesvol bijgewerkt",
        });
        await refetch();
      }
    } catch (error) {
      console.error('[BookingStatus] Error during sync:', error);
      toast({
        title: "Sync Mislukt",
        description: "Er ging iets mis tijdens het synchroniseren",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-green-600" />
            Booking Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-green-600" />
            <div className="text-sm text-gray-600">Status laden...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasCalcomConnection = isCalcomConnected();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-green-600" />
          Booking Status
          {hasCalcomConnection && (
            <Badge variant="outline" className="ml-auto bg-green-50 text-green-700">
              <CheckCircle className="h-3 w-3 mr-1" />
              Actief
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cal.com Account Status */}
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-green-900">
                Cal.com Account
                <CheckCircle className="h-4 w-4 inline ml-2 text-green-600" />
              </div>
              <div className="text-sm text-green-700">
                Automatisch aangemaakt • 24/7 booking beschikbaar
              </div>
            </div>
          </div>
        </div>

        {/* Recent Bookings Sync Status */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <div className="font-medium text-gray-900">Recent Bookings Sync</div>
            <div className="text-sm text-gray-600">
              {hasCalcomConnection 
                ? 'Automatische synchronisatie actief'
                : 'Geen actieve verbinding'
              }
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-1" />
                Sync Now
              </>
            )}
          </Button>
        </div>

        {/* Link to Cal.com Dashboard */}
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => window.open('https://cal-web-xxx.onrender.com', '_blank')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Open Cal.com Dashboard
        </Button>

        {/* Status Info */}
        <div className="text-xs text-gray-500 text-center">
          {hasCalcomConnection 
            ? `${connections.length} Cal.com verbinding${connections.length !== 1 ? 'en' : ''} actief`
            : 'Setup wordt automatisch voltooid bij registratie'
          }
        </div>
      </CardContent>
    </Card>
  );
};
