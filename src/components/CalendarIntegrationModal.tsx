
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
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

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
      setErrorMessage('');
    }
  }, [connections, step]);

  const cleanupPendingConnections = async () => {
    if (!user) return;
    
    try {
      console.log('[CalendarModal] Cleaning up pending connections...');
      
      const { error } = await supabase
        .from('calendar_connections')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .eq('provider_account_id', 'pending');

      if (error) {
        console.error('[CalendarModal] Error cleaning up pending connections:', error);
      } else {
        console.log('[CalendarModal] Pending connections cleaned up successfully');
      }
    } catch (error) {
      console.error('[CalendarModal] Unexpected error during cleanup:', error);
    }
  };

  const handleGoogleConnect = async () => {
    if (isConnecting) return;
    
    try {
      setIsConnecting(true);
      console.log('[CalendarModal] Starting Google OAuth with calendar scopes...');
      
      // Clear any existing errors
      setErrorMessage('');
      
      // Cleanup any pending connections first
      await cleanupPendingConnections();
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?calendar=true`,
          scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) {
        console.error('[CalendarModal] Google OAuth error:', error);
        setErrorMessage(`OAuth fout: ${error.message}`);
        setStep('error');
        
        toast({
          title: "Verbindingsfout",
          description: "Google Calendar verbinding mislukt. Controleer de OAuth configuratie.",
          variant: "destructive",
        });
        return;
      }

      console.log('[CalendarModal] Google OAuth initiated successfully');
      
    } catch (error: any) {
      console.error('[CalendarModal] Unexpected Google OAuth error:', error);
      setErrorMessage(`Onverwachte fout: ${error.message}`);
      setStep('error');
      
      toast({
        title: "Fout",
        description: "Er ging iets mis bij het verbinden. Probeer het opnieuw.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (provider: CalendarProvider) => {
    const connection = connections.find(conn => conn.provider === provider.id);
    if (connection) {
      const success = await disconnectProvider(connection.id);
      if (success && connections.length === 1) {
        setStep('select');
        setErrorMessage('');
      }
    }
  };

  const handleTestConnection = async () => {
    const success = await syncCalendarEvents();
    if (!success) {
      setErrorMessage('Synchronisatie mislukt. Controleer je internetverbinding.');
      setStep('error');
    }
  };

  const handleContinue = () => {
    onComplete();
    onOpenChange(false);
    setTimeout(() => {
      setStep('select');
      setErrorMessage('');
    }, 300);
  };

  const handleChangeCalendar = () => {
    setStep('select');
    setErrorMessage('');
  };

  const handleTryAgain = () => {
    setStep('select');
    setErrorMessage('');
  };

  const handleResetConnections = async () => {
    // Disconnect all current connections
    for (const connection of connections) {
      await disconnectProvider(connection.id);
    }
    
    // Also cleanup any pending connections
    await cleanupPendingConnections();
    
    setStep('select');
    setErrorMessage('');
    
    toast({
      title: "Reset Voltooid",
      description: "Alle agenda verbindingen zijn verwijderd.",
    });
  };

  const handleRetryConnection = async () => {
    setErrorMessage('');
    await cleanupPendingConnections();
    await handleGoogleConnect();
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
              error={errorMessage}
              onRetryConnection={handleRetryConnection}
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
              error={errorMessage}
              onTryAgain={handleTryAgain}
              onReset={handleResetConnections}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
