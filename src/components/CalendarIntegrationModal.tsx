
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

  // Use the centralized connection manager
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
      console.log('[CalendarModal] Got user:', user?.id);
      setUser(user);
    };
    getUser();
  }, []);

  // Update step based on connection status
  useEffect(() => {
    console.log('[CalendarModal] Connection state changed:', {
      isConnected: connectionManager.isConnected,
      connections: connections.length,
      step,
      error: connectionManager.error
    });

    if (connectionManager.isConnected && step === 'select') {
      console.log('[CalendarModal] Moving to connected step - connection manager');
      setStep('connected');
    } else if (connections.length > 0 && step === 'select') {
      console.log('[CalendarModal] Moving to connected step - connections found');
      setStep('connected');
    } else if (connectionManager.error && step === 'select' && !connectionManager.isConnecting) {
      console.log('[CalendarModal] Moving to error step:', connectionManager.error);
      setStep('error');
    }
  }, [connectionManager.isConnected, connectionManager.error, connectionManager.isConnecting, connections.length, step]);

  const handleGoogleConnect = () => {
    if (connectionManager.isConnecting) {
      console.log('[CalendarModal] Already connecting, ignoring click');
      return;
    }
    console.log('[CalendarModal] Starting Google connect flow');
    setShowConfirmModal(true);
  };

  const handleConfirmConnection = async () => {
    setShowConfirmModal(false);
    
    try {
      console.log('[CalendarModal] User confirmed connection, starting OAuth flow');
      const success = await connectionManager.initiateConnection();
      
      if (!success && connectionManager.error) {
        console.log('[CalendarModal] Connection failed, moving to error step');
        setStep('error');
      }
      // If successful, the OAuth flow will redirect to auth/callback
      // and the connection will be handled there
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
    console.log('[CalendarModal] Testing connection');
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
    console.log('[CalendarModal] Changing calendar, back to select');
    setStep('select');
  };

  const handleTryAgain = () => {
    console.log('[CalendarModal] Trying again, resetting state');
    connectionManager.resetState();
    setStep('select');
  };

  const handleResetConnections = async () => {
    console.log('[CalendarModal] Resetting all connections');
    
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
