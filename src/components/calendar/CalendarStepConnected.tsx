
import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, RefreshCw, Loader2 } from 'lucide-react';
import { CalendarConnectionStatus } from './CalendarConnectionStatus';
import { CalendarConnection } from '@/types/calendar';

interface CalendarProvider {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface CalendarStepConnectedProps {
  connections: CalendarConnection[];
  providers: CalendarProvider[];
  loading: boolean;
  onDisconnect: (provider: CalendarProvider) => Promise<void>;
  onChangeCalendar: () => void;
  onTestConnection: () => void;
  onContinue: () => void;
}

export const CalendarStepConnected: React.FC<CalendarStepConnectedProps> = ({
  connections,
  providers,
  loading,
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
        onClick={onContinue}
        className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
        size="lg"
      >
        Doorgaan naar Stap 2
      </Button>
    </>
  );
};
