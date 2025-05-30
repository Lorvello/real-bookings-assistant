import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { useCalendarIntegration } from '@/hooks/useCalendarIntegration';
import { useCalendarConnectionManager } from '@/hooks/useCalendarConnectionManager';
import { CalendarConnectionConfirmModal } from '@/components/CalendarConnectionConfirmModal';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
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
    description: 'Meest populaire keuze - synchroniseert direct',
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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const { toast } = useToast();

  // Use the new centralized connection manager
  const connectionManager = useCalendarConnectionManager(user);
  
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
    if (connectionManager.isConnected && step === 'select') {
      setStep('connected');
    }
  }, [connectionManager.isConnected, step]);

  useEffect(() => {
    if (connections.length > 0 && step === 'select') {
      setStep('connected');
    }
  }, [connections, step]);

  const handleGoogleConnect = () => {
    if (connectionManager.isConnecting) return;
    setShowConfirmModal(true);
  };

  const handleConfirmConnection = async () => {
    setShowConfirmModal(false);
    
    try {
      console.log('[CalendarModal] Starting connection with confirmation modal');
      const success = await connectionManager.initiateConnection();
      
      if (success) {
        // The callback will handle the actual connection creation
        // We'll wait for it and then check for success
        setTimeout(async () => {
          const connected = await connectionManager.waitForConnection();
          if (connected) {
            setStep('connected');
            await refetch();
          } else {
            setStep('error');
          }
        }, 1000);
      } else {
        setStep('error');
      }
    } catch (error: any) {
      console.error('[CalendarModal] Connection failed:', error);
      setStep('error');
    }
  };

  const handleDisconnect = async (provider: CalendarProvider) => {
    const connection = connections.find(conn => conn.provider === provider.id);
    if (connection) {
      const success = await disconnectProvider(connection.id);
      if (success && connections.length === 1) {
        setStep('select');
        await connectionManager.checkConnection();
      }
    }
  };

  const handleTestConnection = async () => {
    const success = await syncCalendarEvents();
    if (!success) {
      setStep('error');
    }
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
    connectionManager.resetState();
    setStep('select');
  };

  const handleResetConnections = async () => {
    for (const connection of connections) {
      await disconnectProvider(connection.id);
    }
    
    connectionManager.resetState();
    await connectionManager.checkConnection();
    
    setStep('select');
    
    toast({
      title: "Reset Voltooid",
      description: "Alle agenda verbindingen zijn verwijderd.",
    });
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-green-600" />
            <p className="text-gray-600">Agenda verbindingen laden...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Agenda Integratie Setup</DialogTitle>
          </DialogHeader>
          
          <div className="p-2">
            {step === 'select' && (
              <CalendarSelectStep
                providers={calendarProviders}
                isProviderConnected={isProviderConnected}
                onGoogleConnect={handleGoogleConnect}
                error={connectionManager.error || undefined}
                onRetryConnection={handleGoogleConnect}
                onResetConnections={handleResetConnections}
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
                error={connectionManager.error || 'Onbekende fout'}
                onTryAgain={handleTryAgain}
                onReset={handleResetConnections}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CalendarConnectionConfirmModal
        open={showConfirmModal}
        onOpenChange={setShowConfirmModal}
        onConfirm={handleConfirmConnection}
        isConnecting={connectionManager.isConnecting}
      />
    </>
  );
};
