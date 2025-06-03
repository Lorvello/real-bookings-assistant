
import React, { useState, useEffect } from 'react';
import { CalendarConnection } from '@/types/calendar';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { useAuth } from '@/hooks/useAuth';
import { CalendarStepSelector } from './CalendarStepSelector';
import { CalendarStepConnecting } from './CalendarStepConnecting';
import { CalendarStepConnected } from './CalendarStepConnected';
import { CalendarStepError } from './CalendarStepError';
import { initiateCalcomOAuth, disconnectCalcomProvider } from '@/utils/calendar/calcomIntegration';
import { Calendar } from 'lucide-react';

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

  // Cal.com alleen provider
  const providers: CalendarProvider[] = [
    {
      id: 'calcom',
      name: 'Cal.com',
      description: 'Synchroniseer je Cal.com boekingen automatisch',
      icon: (
        <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white">
          <Calendar className="h-6 w-6" />
        </div>
      ),
      color: 'bg-orange-50 border-orange-200 hover:bg-orange-100'
    }
  ];

  useEffect(() => {
    if (connections.length > 0) {
      setStep('connected');
    }
  }, [connections]);

  const handleProviderConnect = async (providerId: string) => {
    if (!user) return;
    
    setStep('connecting');
    try {
      if (providerId === 'calcom') {
        await initiateCalcomOAuth(user);
      } else {
        setError(`${providerId} wordt momenteel niet ondersteund`);
        setStep('error');
      }
    } catch (error) {
      console.error('Error connecting to provider:', error);
      setError(`Kon niet verbinden met ${providerId}`);
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
    if (!user) return;

    try {
      const connection = connections.find(conn => conn.provider === provider.id && conn.is_active);
      if (!connection) {
        console.log('No connection found for provider:', provider.id);
        return;
      }

      if (provider.id === 'calcom') {
        const success = await disconnectCalcomProvider(user, connection.id);
        if (success) {
          console.log('Successfully disconnected Cal.com');
          await refetch();
        }
      }
    } catch (error) {
      console.error('Error disconnecting provider:', error);
    }
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
      <CalendarStepSelector
        providers={providers}
        error={error}
        isProviderConnected={isProviderConnected}
        onProviderConnect={handleProviderConnect}
        onRetryConnection={handleRetryConnection}
        onResetConnections={handleResetConnections}
      />
    );
  }

  if (step === 'connecting') {
    return <CalendarStepConnecting provider={provider} />;
  }

  if (step === 'connected') {
    return (
      <CalendarStepConnected
        connections={connections}
        providers={providers}
        loading={loading}
        onDisconnect={handleDisconnect}
        onChangeCalendar={handleChangeCalendar}
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
        onReset={handleResetConnections}
      />
    );
  }

  return null;
};
