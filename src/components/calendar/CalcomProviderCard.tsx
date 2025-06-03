
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ExternalLink, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { initiateCalcomOAuth, syncCalcomBookings } from '@/utils/calendar/calcomIntegration';

interface CalcomProviderCardProps {
  isConnected: boolean;
  onRefresh: () => void;
}

export const CalcomProviderCard: React.FC<CalcomProviderCardProps> = ({
  isConnected,
  onRefresh
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleConnect = async () => {
    if (!user) return;

    setConnecting(true);
    try {
      await initiateCalcomOAuth(user);
    } catch (error) {
      console.error('Cal.com connect error:', error);
      toast({
        title: "Verbinding Mislukt",
        description: "Kon niet verbinden met Cal.com. Probeer het opnieuw.",
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    if (!user) return;

    setSyncing(true);
    try {
      const success = await syncCalcomBookings(user);
      if (success) {
        toast({
          title: "Cal.com Gesynchroniseerd",
          description: "Je Cal.com boekingen zijn bijgewerkt",
        });
        onRefresh();
      } else {
        toast({
          title: "Sync Mislukt",
          description: "Er ging iets mis tijdens het synchroniseren",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Cal.com sync error:', error);
      toast({
        title: "Sync Fout",
        description: "Er trad een onverwachte fout op",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                Cal.com
              </h3>
              {isConnected ? (
                <Badge variant="default" className="bg-green-600">
                  Verbonden
                </Badge>
              ) : (
                <Badge variant="secondary">
                  Niet verbonden
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Synchroniseer je Cal.com boekingen automatisch
            </p>
            <div className="flex space-x-2">
              {!isConnected ? (
                <Button 
                  onClick={handleConnect}
                  disabled={connecting}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  size="sm"
                >
                  {connecting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                      Verbinden...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Verbind Cal.com
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={handleSync}
                  disabled={syncing}
                  variant="outline"
                  size="sm"
                >
                  {syncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                      Synchroniseren...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Synchroniseer
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
