
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Calendar, CheckCircle, ExternalLink } from 'lucide-react';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { getOAuthProvider, createPendingConnection } from '@/utils/calendarConnectionUtils';

interface CalendarIntegrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export const CalendarIntegrationModal: React.FC<CalendarIntegrationModalProps> = ({
  open,
  onOpenChange,
  onComplete
}) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const { toast } = useToast();

  const { 
    connections, 
    loading: connectionsLoading,
    disconnectProvider,
    refetch 
  } = useCalendarIntegration(user);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
  }, []);

  const handleGoogleConnect = async () => {
    if (!user) return;

    try {
      setConnecting(true);
      console.log('[CalendarModal] Starting Google Calendar OAuth...');

      // Get OAuth provider configuration
      const provider = await getOAuthProvider('google');
      if (!provider) {
        throw new Error('Google OAuth provider not configured');
      }

      // Create pending connection
      const connectionId = await createPendingConnection(user, 'google');
      if (!connectionId) {
        throw new Error('Failed to create pending connection');
      }

      // Build OAuth URL
      const params = new URLSearchParams({
        client_id: provider.client_id!,
        redirect_uri: `${window.location.origin}/auth/callback?calendar=true`,
        response_type: 'code',
        scope: provider.scope,
        access_type: 'offline',
        prompt: 'consent',
        state: connectionId
      });

      const authUrl = `${provider.auth_url}?${params.toString()}`;
      
      console.log('[CalendarModal] Redirecting to Google OAuth...');
      window.location.href = authUrl;

    } catch (error: any) {
      console.error('[CalendarModal] Google OAuth error:', error);
      setConnecting(false);
      
      toast({
        title: "Verbindingsfout",
        description: error.message || "Google Calendar verbinding mislukt.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    const success = await disconnectProvider(connectionId);
    if (success) {
      await refetch();
    }
  };

  const handleContinue = () => {
    onComplete();
    onOpenChange(false);
  };

  if (loading || connectionsLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-green-600" />
            <p className="text-gray-600">Agenda verbindingen laden...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const hasConnections = connections.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-6">
            {hasConnections ? 'Agenda Verbonden' : 'Verbind je Agenda'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-2">
          {hasConnections ? (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Perfect! Je agenda is verbonden
                </h3>
                <p className="text-gray-600">
                  Je Google Calendar is succesvol gekoppeld en wordt automatisch gesynchroniseerd.
                </p>
              </div>

              <div className="space-y-4">
                {connections.map((connection) => (
                  <Card key={connection.id} className="border-green-200 bg-green-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                          G
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-green-900">Google Calendar</h4>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="text-sm text-green-800">
                            Verbonden op {new Date(connection.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDisconnect(connection.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Verbreken
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-center pt-4">
                <Button onClick={handleContinue} className="bg-green-600 hover:bg-green-700">
                  Doorgaan naar Dashboard
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <Calendar className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Kies je agenda provider
                </h3>
                <p className="text-gray-600">
                  Verbind je agenda om automatisch beschikbaarheid te synchroniseren
                </p>
              </div>

              <Card className="bg-blue-50 border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      G
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">Google Calendar</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Meest populaire keuze - synchroniseert direct
                      </p>
                      <Button 
                        onClick={handleGoogleConnect}
                        disabled={connecting}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {connecting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Verbinden...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Verbind Google Calendar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
