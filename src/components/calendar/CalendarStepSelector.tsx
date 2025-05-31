
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';
import { CalendarOAuthConfig } from './CalendarOAuthConfig';
import { CalendarConnectionError } from './CalendarConnectionError';
import { CalendarProviderCard } from './CalendarProviderCard';

interface CalendarProvider {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface CalendarStepSelectorProps {
  providers: CalendarProvider[];
  error: string | null;
  isProviderConnected: (providerId: string) => boolean;
  onProviderConnect: () => void;
  onRetryConnection: () => void;
  onResetConnections: () => void;
}

export const CalendarStepSelector: React.FC<CalendarStepSelectorProps> = ({
  providers,
  error,
  isProviderConnected,
  onProviderConnect,
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

      {error && (
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
            onConnect={onProviderConnect}
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
