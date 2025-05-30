
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
import { CalendarOAuthConfig } from '@/components/CalendarOAuthConfig';
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
}

export const CalendarSelectStep: React.FC<CalendarSelectStepProps> = ({
  providers,
  isProviderConnected,
  onGoogleConnect
}) => {
  return (
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
            We only access your calendar availability, not personal details
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">✅ Connected Successfully!</h2>
        <p className="text-gray-600">Your calendar is now connected and ready to sync</p>
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
          Change Calendar
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
          Sync Events
        </Button>
      </div>

      <Button 
        onClick={onContinue}
        className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
        size="lg"
      >
        Continue to Step 2
      </Button>
    </>
  );
};

interface CalendarErrorStepProps {
  onTryAgain: () => void;
}

export const CalendarErrorStep: React.FC<CalendarErrorStepProps> = ({
  onTryAgain
}) => {
  return (
    <div className="text-center py-8">
      <div className="text-red-500 mb-4">
        <AlertTriangle className="h-16 w-16 mx-auto" />
      </div>
      <h3 className="text-xl font-semibold mb-2 text-red-900">Connection Failed</h3>
      <p className="text-red-700 mb-6">Unable to connect to calendar provider</p>
      
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          onClick={onTryAgain}
          className="flex-1"
        >
          Try Again
        </Button>
      </div>
    </div>
  );
};
