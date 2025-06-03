
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, RefreshCw, CheckCircle, Zap, ExternalLink } from 'lucide-react';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const CalendarManagementCard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  
  const {
    connections,
    loading,
    syncCalendarEvents,
    refetch,
    isProviderConnected
  } = useCalendarIntegration(user);

  const handleSync = async () => {
    console.log('[CalendarManagement] Starting manual sync');
    setSyncing(true);
    
    try {
      const success = await syncCalendarEvents();
      if (success) {
        toast({
          title: "Cal.com Gesynchroniseerd",
          description: "Je Cal.com events zijn succesvol bijgewerkt",
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
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-green-600" />
            Cal.com Integratie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-green-600" />
            <div className="text-sm text-gray-600">Cal.com status laden...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasCalcomConnection = isProviderConnected('calcom');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-green-600" />
          Cal.com Integratie
          {hasCalcomConnection && (
            <Badge variant="outline" className="ml-auto bg-green-50 text-green-700">
              <CheckCircle className="h-3 w-3 mr-1" />
              Actief
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasCalcomConnection ? (
          <>
            {/* Active Connection Display */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-green-900">Cal.com Verbonden</div>
                  <div className="text-sm text-green-700">
                    Automatische synchronisatie actief • 24/7 booking beschikbaar
                  </div>
                </div>
                <Zap className="h-5 w-5 text-green-600" />
              </div>
            </div>

            {/* Manual Sync */}
            <Button
              variant="outline"
              onClick={handleSync}
              disabled={syncing}
              className="w-full"
            >
              {syncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Synchroniseren...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Nu Synchroniseren
                </>
              )}
            </Button>

            {/* Cal.com Dashboard Link */}
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => window.open('https://cal-web-xxx.onrender.com', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Cal.com Dashboard
            </Button>
          </>
        ) : (
          <>
            {/* No Connection State */}
            <Alert className="border-orange-200 bg-orange-50">
              <Calendar className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <div className="font-medium mb-1">Cal.com Setup Vereist</div>
                <div className="text-sm">
                  Je Cal.com account wordt automatisch aangemaakt bij registratie. 
                  Als je dit ziet, probeer dan de pagina te verversen.
                </div>
              </AlertDescription>
            </Alert>

            {/* Refresh Button */}
            <Button
              variant="outline"
              onClick={refetch}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Status Controleren
            </Button>
          </>
        )}

        {/* Status Info */}
        <div className="text-xs text-gray-500 text-center">
          {hasCalcomConnection 
            ? `${connections.length} Cal.com verbinding${connections.length !== 1 ? 'en' : ''} actief`
            : 'Geen actieve Cal.com verbindingen'
          }
        </div>
      </CardContent>
    </Card>
  );
};
