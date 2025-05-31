
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, ArrowLeft, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { getOAuthProvider, createPendingConnection } from '@/utils/calendarConnectionUtils';
import { CalendarProviderSelector } from './calendar/CalendarProviderSelector';

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
  const [currentStep, setCurrentStep] = useState<'select' | 'connecting' | 'connected'>('select');
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

  useEffect(() => {
    // Als er al verbindingen zijn, ga direct naar connected step
    if (connections.length > 0) {
      setCurrentStep('connected');
    } else {
      setCurrentStep('select');
    }
  }, [connections]);

  const handleProviderSelect = async (providerId: string) => {
    if (providerId === 'google') {
      await handleGoogleConnect();
    } else {
      toast({
        title: "Nog niet beschikbaar",
        description: `${providerId} kalender integratie komt binnenkort beschikbaar.`,
        variant: "destructive",
      });
    }
  };

  const handleGoogleConnect = async () => {
    if (!user) return;

    try {
      setConnecting(true);
      setCurrentStep('connecting');
      
      console.log('[CalendarModal] Starting reliable Google Calendar OAuth...');

      // Get OAuth provider configuration
      const provider = await getOAuthProvider('google');
      if (!provider) {
        throw new Error('Google OAuth provider not configured');
      }

      // Check if user already has a Google connection
      const existingConnection = connections.find(conn => conn.provider === 'google' && conn.is_active);
      if (existingConnection) {
        console.log('[CalendarModal] User already has active Google connection');
        setCurrentStep('connected');
        setConnecting(false);
        return;
      }

      // Create pending connection
      const connectionId = await createPendingConnection(user, 'google');
      if (!connectionId) {
        throw new Error('Failed to create pending connection');
      }

      // Build reliable OAuth URL with proper redirect
      const baseUrl = window.location.origin;
      const redirectUri = `${baseUrl}/auth/callback?calendar=true`;
      
      const params = new URLSearchParams({
        client_id: provider.client_id!,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        access_type: 'offline',
        prompt: 'consent',
        state: connectionId,
        include_granted_scopes: 'true'
      });

      const authUrl = `${provider.auth_url}?${params.toString()}`;
      
      console.log('[CalendarModal] Redirecting to Google OAuth with calendar scopes...');
      console.log('[CalendarModal] Redirect URI:', redirectUri);
      
      // Force redirect to Google OAuth
      window.location.href = authUrl;

    } catch (error: any) {
      console.error('[CalendarModal] Google OAuth error:', error);
      setConnecting(false);
      setCurrentStep('select');
      
      toast({
        title: "Verbindingsfout",
        description: error.message || "Google Calendar verbinding mislukt. Probeer het opnieuw.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    const success = await disconnectProvider(connectionId);
    if (success) {
      await refetch();
      setCurrentStep('select');
    }
  };

  const handleContinue = () => {
    onComplete();
    onOpenChange(false);
  };

  const handleBackToSelection = () => {
    setCurrentStep('select');
    setConnecting(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-6">
            {currentStep === 'connected' ? 'Agenda Verbonden' : 'Verbind je Agenda'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-2">
          {currentStep === 'select' && (
            <CalendarProviderSelector
              onProviderSelect={handleProviderSelect}
              connecting={connecting}
            />
          )}

          {currentStep === 'connecting' && (
            <div className="text-center py-8">
              <Loader2 className="h-16 w-16 animate-spin mx-auto mb-4 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Verbinden met Google Calendar...
              </h3>
              <p className="text-gray-600 mb-6">
                Je wordt doorgestuurd naar Google om toestemming te geven.
              </p>
              <Button 
                variant="outline" 
                onClick={handleBackToSelection}
                className="mt-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Terug naar selectie
              </Button>
            </div>
          )}

          {currentStep === 'connected' && connections.length > 0 && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Perfect! Je agenda is verbonden
                </h3>
                <p className="text-gray-600">
                  Je Google Calendar wordt automatisch gesynchroniseerd.
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
                            Verbonden op {new Date(connection.created_at).toLocaleDateString('nl-NL')}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleBackToSelection}
                          >
                            Andere agenda
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDisconnect(connection.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Verbreken
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Alert className="border-green-200 bg-green-50">
                <Shield className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <span className="text-sm">
                    Je agenda wordt automatisch gesynchroniseerd. We hebben alleen toegang tot beschikbaarheid.
                  </span>
                </AlertDescription>
              </Alert>

              <div className="flex justify-center pt-4">
                <Button onClick={handleContinue} className="bg-green-600 hover:bg-green-700">
                  Doorgaan naar Dashboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
