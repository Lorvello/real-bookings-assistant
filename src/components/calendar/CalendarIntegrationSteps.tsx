
import React, { useState, useEffect } from 'react';
import { CalendarConnection } from '@/types/calendar';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { useAuth } from '@/hooks/useAuth';
import { CalendarStepConnecting } from './CalendarStepConnecting';
import { CalendarStepConnected } from './CalendarStepConnected';
import { CalendarStepError } from './CalendarStepError';
import { initiateCalcomRegistration, disconnectCalcomProvider } from '@/utils/calendar/calcomIntegration';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CalendarProvider {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface CalendarIntegrationStepsProps {
  provider?: string;
  onComplete: () => void;
}

export const CalendarIntegrationSteps: React.FC<CalendarIntegrationStepsProps> = ({
  onComplete
}) => {
  const { user } = useAuth();
  const { connections, loading, refetch } = useCalendarIntegration(user);
  const [step, setStep] = useState<'setup' | 'connecting' | 'connected' | 'error'>('setup');
  const [error, setError] = useState<string | null>(null);

  // Cal.com provider definition
  const calcomProvider: CalendarProvider = {
    id: 'calcom',
    name: 'Cal.com',
    description: 'Automatische Cal.com integratie voor bookings en beschikbaarheid',
    icon: (
      <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white">
        <Calendar className="h-6 w-6" />
      </div>
    ),
    color: 'bg-orange-50 border-orange-200 hover:bg-orange-100'
  };

  useEffect(() => {
    if (connections.length > 0) {
      setStep('connected');
    }
  }, [connections]);

  const handleCalcomSetup = async () => {
    if (!user) return;
    
    setStep('connecting');
    try {
      const success = await initiateCalcomRegistration(user);
      if (success) {
        await refetch();
        setStep('connected');
      } else {
        throw new Error('Cal.com registratie mislukt');
      }
    } catch (error: any) {
      console.error('Error setting up Cal.com:', error);
      setError(error.message || 'Kon Cal.com niet instellen');
      setStep('error');
    }
  };

  const handleDisconnect = async () => {
    if (!user || connections.length === 0) return;

    try {
      const connection = connections[0];
      const success = await disconnectCalcomProvider(user, connection.id);
      if (success) {
        await refetch();
        setStep('setup');
      }
    } catch (error) {
      console.error('Error disconnecting Cal.com:', error);
    }
  };

  const handleRetryConnection = () => {
    setError(null);
    setStep('setup');
  };

  const handleTestConnection = async () => {
    await refetch();
  };

  const handleContinue = () => {
    onComplete();
  };

  if (step === 'setup') {
    return (
      <Card className={`${calcomProvider.color} transition-colors`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {calcomProvider.icon}
            <div>
              <div className="font-semibold">{calcomProvider.name}</div>
              <div className="text-sm text-gray-600 font-normal">
                {calcomProvider.description}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleCalcomSetup}
            className="w-full"
          >
            Cal.com Account Aanmaken
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === 'connecting') {
    return <CalendarStepConnecting provider="Cal.com" />;
  }

  if (step === 'connected') {
    return (
      <CalendarStepConnected
        connections={connections}
        providers={[calcomProvider]}
        loading={loading}
        onDisconnect={handleDisconnect}
        onChangeCalendar={() => setStep('setup')}
        onTestConnection={handleTestConnection}
        onContinue={handleContinue}
      />
    );
  }

  if (step === 'error') {
    return (
      <CalendarStepError
        error={error}
        onRetry={handleRetryConnection}
        onReset={handleRetryConnection}
      />
    );
  }

  return null;
};
