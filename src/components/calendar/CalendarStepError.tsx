
import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface CalendarStepErrorProps {
  error: string | null;
  onRetry: () => void;
  onReset: () => void;
}

export const CalendarStepError: React.FC<CalendarStepErrorProps> = ({
  error,
  onRetry,
  onReset
}) => {
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
          onClick={onRetry}
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
