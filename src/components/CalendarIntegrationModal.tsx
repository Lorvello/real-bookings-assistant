
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { 
  CalendarSelectStep,
  CalendarConnectedStep,
  CalendarErrorStep
} from './calendar/CalendarIntegrationSteps';

interface CalendarProvider {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface CalendarIntegrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const calendarProviders: CalendarProvider[] = [
  {
    id: 'google',
    name: 'Google Calendar',
    description: 'Most popular choice - syncs instantly',
    icon: <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">G</div>,
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
  }
];

export const CalendarIntegrationModal: React.FC<CalendarIntegrationModalProps> = ({
  open,
  onOpenChange,
  onComplete
}) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [step, setStep] = useState<'select' | 'connected' | 'error'>('select');

  const { 
    connections, 
    loading, 
    syncing,
    disconnectProvider, 
    syncCalendarEvents,
    isProviderConnected,
    refetch 
  } = useCalendarIntegration(user);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (connections.length > 0 && step === 'select') {
      setStep('connected');
    }
  }, [connections]);

  const handleGoogleConnect = () => {
    window.location.href = '/login?provider=google&scope=calendar';
  };

  const handleDisconnect = async (provider: CalendarProvider) => {
    const connection = connections.find(conn => conn.provider === provider.id);
    if (connection) {
      const success = await disconnectProvider(connection.id);
      if (success && connections.length === 1) {
        setStep('select');
      }
    }
  };

  const handleTestConnection = async () => {
    await syncCalendarEvents();
  };

  const handleContinue = () => {
    onComplete();
    onOpenChange(false);
    setTimeout(() => {
      setStep('select');
    }, 300);
  };

  const handleChangeCalendar = () => {
    setStep('select');
  };

  const handleTryAgain = () => {
    setStep('select');
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-green-600" />
            <p className="text-gray-600">Loading calendar connections...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>Calendar Integration Setup</DialogTitle>
        </DialogHeader>
        
        <div className="p-2">
          {step === 'select' && (
            <CalendarSelectStep
              providers={calendarProviders}
              isProviderConnected={isProviderConnected}
              onGoogleConnect={handleGoogleConnect}
            />
          )}
          
          {step === 'connected' && (
            <CalendarConnectedStep
              connections={connections}
              providers={calendarProviders}
              syncing={syncing}
              onDisconnect={handleDisconnect}
              onChangeCalendar={handleChangeCalendar}
              onTestConnection={handleTestConnection}
              onContinue={handleContinue}
            />
          )}
          
          {step === 'error' && (
            <CalendarErrorStep
              onTryAgain={handleTryAgain}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
