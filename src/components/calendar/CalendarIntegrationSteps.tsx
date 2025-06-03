
import React, { useState, useEffect } from 'react';
import { CalendarConnection } from '@/types/calendar';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { useAuth } from '@/hooks/useAuth';
import { CalendarStepSelector } from './CalendarStepSelector';
import { CalendarStepConnecting } from './CalendarStepConnecting';
import { CalendarStepConnected } from './CalendarStepConnected';
import { CalendarStepError } from './CalendarStepError';
import { initiateCalcomOAuth } from '@/utils/calendar/calcomIntegration';
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
      id: 'calcom',
      name: 'Cal.com',
      description: 'Synchroniseer je Cal.com boekingen',
      icon: (
        <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white">
          <Calendar className="h-6 w-6" />
        </div>
      ),
      color: 'bg-orange-50 border-orange-200 hover:bg-orange-100'
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
    }
  ];

  useEffect(() => {
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

  const handleCalcomConnect = async () => {
    if (!user) return;
    
    setStep('connecting');
    try {
      await initiateCalcomOAuth(user);
    } catch (error) {
      console.error('Error connecting to Cal.com:', error);
      setError('Kon niet verbinden met Cal.com');
      setStep('error');
    }
  };

  const handleProviderConnect = async (providerId: string) => {
    if (providerId === 'google') {
      await handleGoogleConnect();
    } else if (providerId === 'calcom') {
      await handleCalcomConnect();
    } else {
      setError(`${providerId} wordt nog niet ondersteund`);
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

// Keep backward compatibility exports
export const CalendarSelectStep: React.FC<any> = () => null;
export const CalendarConnectedStep: React.FC<any> = () => null;
export const CalendarErrorStep: React.FC<any> = () => null;
