
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  CheckCircle, 
  Loader2, 
  Shield,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { CalendarOAuthConfig } from '@/components/CalendarOAuthConfig';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface CalendarProvider {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface CalendarIntegrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const calendarProviders: CalendarProvider[] = [
  {
    id: 'google',
    name: 'Google Calendar',
    description: 'Most popular choice - syncs instantly',
    icon: <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">G</div>,
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
  }
];

export const CalendarIntegrationModal: React.FC<CalendarIntegrationModalProps> = ({
  open,
  onOpenChange,
  onComplete
}) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [step, setStep] = useState<'select' | 'connected' | 'error'>('select');

  const { 
    connections, 
    loading, 
    syncing,
    disconnectProvider, 
    syncCalendarEvents,
    isProviderConnected,
    refetch 
  } = useCalendarIntegration(user);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (connections.length > 0 && step === 'select') {
      setStep('connected');
    }
  }, [connections]);

  const handleGoogleConnect = () => {
    // Redirect to login page with Google OAuth for calendar access
    window.location.href = '/login?provider=google&scope=calendar';
  };

  const handleDisconnect = async (provider: CalendarProvider) => {
    const connection = connections.find(conn => conn.provider === provider.id);
    if (connection) {
      const success = await disconnectProvider(connection.id);
      if (success && connections.length === 1) {
        setStep('select');
      }
    }
  };

  const handleTestConnection = async () => {
    await syncCalendarEvents();
  };

  const handleContinue = () => {
    onComplete();
    onOpenChange(false);
    setTimeout(() => {
      setStep('select');
    }, 300);
  };

  const handleChangeCalendar = () => {
    setStep('select');
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-green-600" />
            <p className="text-gray-600">Loading calendar connections...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const renderSelectStep = () => (
    <>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Calendar</h2>
        <p className="text-gray-600 mb-4">Connect Google Calendar to sync appointments automatically</p>
        <Badge variant="outline" className="text-sm">
          Step 1 of 3
        </Badge>
      </div>

      <div className="mb-4">
        <CalendarOAuthConfig />
      </div>

      <div className="grid grid-cols-1 gap-4 mb-6">
        {calendarProviders.map((provider) => {
          const isConnected = isProviderConnected(provider.id);
          
          return (
            <Card 
              key={provider.id}
              className={`cursor-pointer transition-all duration-200 ${
                isConnected ? 'border-green-500 bg-green-50' : provider.color
              } hover:shadow-md`}
              onClick={() => !isConnected && handleGoogleConnect()}
            >
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-4 relative">
                  {provider.icon}
                  {isConnected && (
                    <CheckCircle className="h-4 w-4 text-green-600 absolute -top-1 -right-1" />
                  )}
                </div>
                <h3 className="font-semibold text-lg mb-2">{provider.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{provider.description}</p>
                <Button 
                  className={`w-full ${
                    isConnected 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white`}
                  size="sm"
                >
                  {isConnected ? 'Connected' : 'Connect'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Alert className="border-green-200 bg-green-50">
        <Shield className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <span className="text-sm">
            We only access your calendar availability, not personal details
          </span>
        </AlertDescription>
      </Alert>
    </>
  );

  const renderConnectedStep = () => (
    <>
      <div className="text-center mb-6">
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">✅ Connected Successfully!</h2>
        <p className="text-gray-600">Your calendar is now connected and ready to sync</p>
      </div>

      <div className="space-y-4 mb-6">
        {connections.map((connection) => {
          const provider = calendarProviders.find(p => p.id === connection.provider);
          if (!provider) return null;

          return (
            <Card key={connection.id} className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {provider.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-green-900">{provider.name}</h4>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-green-800">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Connected
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(connection.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDisconnect(provider)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Disconnect
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-3 mb-6">
        <Button 
          variant="outline" 
          onClick={handleChangeCalendar}
          className="flex-1"
        >
          Change Calendar
        </Button>
        <Button 
          variant="outline" 
          onClick={handleTestConnection}
          className="flex-1"
          disabled={syncing}
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Sync Events
        </Button>
      </div>

      <Button 
        onClick={handleContinue}
        className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
        size="lg"
      >
        Continue to Step 2
      </Button>
    </>
  );

  const renderErrorStep = () => (
    <div className="text-center py-8">
      <div className="text-red-500 mb-4">
        <AlertTriangle className="h-16 w-16 mx-auto" />
      </div>
      <h3 className="text-xl font-semibold mb-2 text-red-900">Connection Failed</h3>
      <p className="text-red-700 mb-6">Unable to connect to calendar provider</p>
      
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          onClick={() => setStep('select')}
          className="flex-1"
        >
          Try Again
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>Calendar Integration Setup</DialogTitle>
        </DialogHeader>
        
        <div className="p-2">
          {step === 'select' && renderSelectStep()}
          {step === 'connected' && renderConnectedStep()}
          {step === 'error' && renderErrorStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
