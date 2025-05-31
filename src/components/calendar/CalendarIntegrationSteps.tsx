import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  Loader2, 
  Shield,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { CalendarOAuthConfig } from './CalendarOAuthConfig';
import { CalendarConnectionError } from './CalendarConnectionError';
import { CalendarProviderCard } from './CalendarProviderCard';
import { CalendarConnectionStatus } from './CalendarConnectionStatus';
import { CalendarConnection } from '@/types/calendar';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { useAuth } from '@/hooks/useAuth';

interface CalendarProvider {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface CalendarIntegrationStepsProps {
  provider: string;
  onComplete: () => void;
}

export const CalendarIntegrationSteps: React.FC<CalendarIntegrationStepsProps> = ({
  provider,
  onComplete
}) => {
  const { user } = useAuth();
  const { connections, loading, refetch } = useCalendarIntegration(user);
  const [step, setStep] = useState<'select' | 'connecting' | 'connected' | 'error'>('select');
  const [error, setError] = useState<string | null>(null);

  const providers: CalendarProvider[] = [
    {
      id: 'google',
      name: 'Google Calendar',
      description: 'Meest populaire keuze - werkt direct',
      icon: (
        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
          G
        </div>
      ),
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
    },
    {
      id: 'microsoft',
      name: 'Microsoft Outlook',
      description: 'Outlook en Exchange kalenders',
      icon: (
        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
          M
        </div>
      ),
      color: 'bg-gray-50 border-gray-200'
    },
    {
      id: 'apple',
      name: 'Apple Calendar',
      description: 'iCloud en Apple kalenders',
      icon: (
        <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center text-white font-bold text-xl">
          🍎
        </div>
      ),
      color: 'bg-gray-50 border-gray-200'
    },
    {
      id: 'calendly',
      name: 'Calendly',
      description: 'Import je Calendly beschikbaarheid',
      icon: (
        <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
          C
        </div>
      ),
      color: 'bg-gray-50 border-gray-200'
    }
  ];

  useEffect(() => {
    // Check if we already have connections
    if (connections.length > 0) {
      setStep('connected');
    }
  }, [connections]);

  const handleGoogleConnect = async () => {
    setStep('connecting');
    try {
      const redirectUrl = `https://qzetadfdmsholqyxxfbh.supabase.co/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(window.location.origin + '/profile')}`;
      window.location.href = redirectUrl;
    } catch (error) {
      console.error('Error connecting to Google:', error);
      setError('Kon niet verbinden met Google Calendar');
      setStep('error');
    }
  };

  const isProviderConnected = (providerId: string) => {
    return connections.some(conn => conn.provider === providerId && conn.is_active);
  };

  const handleRetryConnection = () => {
    setError(null);
    setStep('select');
  };

  const handleResetConnections = () => {
    setError(null);
    setStep('select');
  };

  const handleDisconnect = async (provider: CalendarProvider) => {
    // This would handle disconnection logic
    await refetch();
  };

  const handleChangeCalendar = () => {
    setStep('select');
  };

  const handleTestConnection = async () => {
    await refetch();
  };

  const handleContinue = () => {
    onComplete();
  };

  if (step === 'select') {
    return (
      <>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verbind je Agenda</h2>
          <p className="text-gray-600 mb-4">Verbind Google Calendar om afspraken automatisch te synchroniseren</p>
          <Badge variant="outline" className="text-sm">
            Stap 1 van 3
          </Badge>
        </div>

        <div className="mb-4">
          <CalendarOAuthConfig />
        </div>

        {error && (
          <CalendarConnectionError 
            error={error}
            onRetry={handleRetryConnection}
            onReset={handleResetConnections}
          />
        )}

        <div className="grid grid-cols-1 gap-4 mb-6">
          {providers.map((provider) => (
            <CalendarProviderCard
              key={provider.id}
              provider={provider}
              isConnected={isProviderConnected(provider.id)}
              onConnect={handleGoogleConnect}
            />
          ))}
        </div>

        <Alert className="border-green-200 bg-green-50">
          <Shield className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <span className="text-sm">
              We hebben alleen toegang tot je agenda beschikbaarheid, geen persoonlijke details
            </span>
          </AlertDescription>
        </Alert>
      </>
    );
  }

  if (step === 'connecting') {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-16 w-16 animate-spin mx-auto mb-4 text-blue-600" />
        <h3 className="text-xl font-semibold mb-2">Verbinden met {provider}</h3>
        <p className="text-gray-600">Je wordt doorgestuurd naar de autorisatiepagina...</p>
      </div>
    );
  }

  if (step === 'connected') {
    return (
      <>
        <div className="text-center mb-6">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">✅ Succesvol Verbonden!</h2>
          <p className="text-gray-600">Je agenda is nu verbonden en klaar om te synchroniseren</p>
        </div>

        <CalendarConnectionStatus 
          connections={connections}
          providers={providers}
          onDisconnect={handleDisconnect}
        />

        <div className="flex gap-3 mb-6">
          <Button 
            variant="outline" 
            onClick={handleChangeCalendar}
            className="flex-1"
          >
            Andere Agenda
          </Button>
          <Button 
            variant="outline" 
            onClick={handleTestConnection}
            className="flex-1"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Synchroniseren
          </Button>
        </div>

        <Button 
          onClick={handleContinue}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
          size="lg"
        >
          Doorgaan naar Stap 2
        </Button>
      </>
    );
  }

  if (step === 'error') {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-4">
          <AlertTriangle className="h-16 w-16 mx-auto" />
        </div>
        <h3 className="text-xl font-semibold mb-2 text-red-900">Verbinding Mislukt</h3>
        <p className="text-red-700 mb-6">
          {error?.includes('invalid_client') 
            ? 'OAuth configuratie is incorrect. Controleer Google Cloud Console instellingen.'
            : error || 'Kon niet verbinden met agenda provider'
          }
        </p>
        
        <div className="flex gap-3 justify-center">
          <Button 
            variant="outline" 
            onClick={handleRetryConnection}
            className="flex-1 max-w-40"
          >
            Probeer Opnieuw
          </Button>
          <Button 
            variant="outline" 
            onClick={handleResetConnections}
            className="flex-1 max-w-40"
          >
            Reset Alles
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

// Keep the individual step components for backwards compatibility
export const CalendarSelectStep: React.FC<any> = () => null;
export const CalendarConnectedStep: React.FC<any> = () => null;
export const CalendarErrorStep: React.FC<any> = () => null;
