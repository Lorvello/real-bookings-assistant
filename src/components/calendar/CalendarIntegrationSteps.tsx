
import React from 'react';
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

interface CalendarProvider {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface CalendarSelectStepProps {
  providers: CalendarProvider[];
  isProviderConnected: (provider: string) => boolean;
  onGoogleConnect: () => void;
  error?: string;
  onRetryConnection?: () => void;
  onResetConnections?: () => void;
}

export const CalendarSelectStep: React.FC<CalendarSelectStepProps> = ({
  providers,
  isProviderConnected,
  onGoogleConnect,
  error,
  onRetryConnection,
  onResetConnections
}) => {
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

      {error && onRetryConnection && onResetConnections && (
        <CalendarConnectionError 
          error={error}
          onRetry={onRetryConnection}
          onReset={onResetConnections}
        />
      )}

      <div className="grid grid-cols-1 gap-4 mb-6">
        {providers.map((provider) => (
          <CalendarProviderCard
            key={provider.id}
            provider={provider}
            isConnected={isProviderConnected(provider.id)}
            onConnect={onGoogleConnect}
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
};

interface CalendarConnectedStepProps {
  connections: CalendarConnection[];
  providers: CalendarProvider[];
  syncing: boolean;
  onDisconnect: (provider: CalendarProvider) => void;
  onChangeCalendar: () => void;
  onTestConnection: () => void;
  onContinue: () => void;
}

export const CalendarConnectedStep: React.FC<CalendarConnectedStepProps> = ({
  connections,
  providers,
  syncing,
  onDisconnect,
  onChangeCalendar,
  onTestConnection,
  onContinue
}) => {
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
        onDisconnect={onDisconnect}
      />

      <div className="flex gap-3 mb-6">
        <Button 
          variant="outline" 
          onClick={onChangeCalendar}
          className="flex-1"
        >
          Andere Agenda
        </Button>
        <Button 
          variant="outline" 
          onClick={onTestConnection}
          className="flex-1"
          disabled={syncing}
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Synchroniseren
        </Button>
      </div>

      <Button 
        onClick={onContinue}
        className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
        size="lg"
      >
        Doorgaan naar Stap 2
      </Button>
    </>
  );
};

interface CalendarErrorStepProps {
  error: string;
  onTryAgain: () => void;
  onReset: () => void;
}

export const CalendarErrorStep: React.FC<CalendarErrorStepProps> = ({
  error,
  onTryAgain,
  onReset
}) => {
  return (
    <div className="text-center py-8">
      <div className="text-red-500 mb-4">
        <AlertTriangle className="h-16 w-16 mx-auto" />
      </div>
      <h3 className="text-xl font-semibold mb-2 text-red-900">Verbinding Mislukt</h3>
      <p className="text-red-700 mb-6">
        {error.includes('invalid_client') 
          ? 'OAuth configuratie is incorrect. Controleer Google Cloud Console instellingen.'
          : 'Kon niet verbinden met agenda provider'
        }
      </p>
      
      <div className="flex gap-3 justify-center">
        <Button 
          variant="outline" 
          onClick={onTryAgain}
          className="flex-1 max-w-40"
        >
          Probeer Opnieuw
        </Button>
        <Button 
          variant="outline" 
          onClick={onReset}
          className="flex-1 max-w-40"
        >
          Reset Alles
        </Button>
      </div>
    </div>
  );
};
