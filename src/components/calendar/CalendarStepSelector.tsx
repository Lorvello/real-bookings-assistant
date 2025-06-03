
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Calendar } from 'lucide-react';
import { CalendarConnectionError } from './CalendarConnectionError';
import { CalendarProviderSelector } from './CalendarProviderSelector';

interface CalendarStepSelectorProps {
  providers: any[];
  error: string | null;
  isProviderConnected: (providerId: string) => boolean;
  onProviderConnect: (providerId: string) => void;
  onRetryConnection: () => void;
  onResetConnections: () => void;
}

export const CalendarStepSelector: React.FC<CalendarStepSelectorProps> = ({
  error,
  onProviderConnect,
  onRetryConnection,
  onResetConnections
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Kalender Koppeling</h2>
        <p className="text-gray-600 mb-4">
          Verbind je Cal.com account om automatische booking synchronisatie te activeren
        </p>
        <Badge variant="outline" className="text-sm">
          Setup Stap 1
        </Badge>
      </div>

      {error && (
        <CalendarConnectionError 
          error={error}
          onRetry={onRetryConnection}
          onReset={onResetConnections}
        />
      )}

      <CalendarProviderSelector
        onProviderSelect={onProviderConnect}
        connecting={false}
      />

      <Alert className="border-blue-200 bg-blue-50">
        <Calendar className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Cal.com Integratie:</strong> Na het verbinden kunnen klanten 24/7 afspraken boeken 
          via WhatsApp zonder dat jij handmatig hoeft in te grijpen.
        </AlertDescription>
      </Alert>
    </div>
  );
};
