
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';

interface CalendarConnectionErrorProps {
  error: string;
  onRetry: () => void;
  onReset: () => void;
}

export const CalendarConnectionError: React.FC<CalendarConnectionErrorProps> = ({
  error,
  onRetry,
  onReset
}) => {
  const isOAuthError = error.includes('invalid_client') || error.includes('401');
  
  const handleOpenDocs = () => {
    window.open('https://docs.lovable.dev/integrations/supabase/', '_blank');
  };

  return (
    <Alert className="border-red-200 bg-red-50 mb-4">
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-800">
        <div className="space-y-3">
          <p className="font-medium">
            {isOAuthError ? 'OAuth Configuratie Fout' : 'Verbindingsfout'}
          </p>
          <p className="text-sm">{error}</p>
          
          {isOAuthError && (
            <div className="text-sm space-y-2">
              <p className="font-medium">Mogelijke oplossingen:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Controleer Google Cloud Console OAuth configuratie</li>
                <li>Verificeer Authorized JavaScript origins</li>
                <li>Controleer Authorized redirect URIs</li>
                <li>Zorg dat Google Calendar API geactiveerd is</li>
                <li>Controleer Supabase Site URL instellingen</li>
              </ul>
            </div>
          )}
          
          <div className="flex gap-2 mt-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRetry}
              className="text-red-700 hover:text-red-800"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Probeer Opnieuw
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onReset}
              className="text-red-700 hover:text-red-800"
            >
              Reset Configuratie
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleOpenDocs}
              className="text-red-700 hover:text-red-800"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Documentatie
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};
