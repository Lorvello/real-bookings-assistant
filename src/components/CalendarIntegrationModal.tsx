
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CalendarProviderSelector } from '@/components/calendar/CalendarProviderSelector';
import { CalendarIntegrationSteps } from '@/components/calendar/CalendarIntegrationSteps';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { initiateCalcomOAuth } from '@/utils/calendar/calcomIntegration';

interface CalendarIntegrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export const CalendarIntegrationModal: React.FC<CalendarIntegrationModalProps> = ({
  open,
  onOpenChange,
  onComplete
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const handleProviderSelect = async (providerId: string) => {
    console.log('[CalendarModal] Provider selected:', providerId);
    setSelectedProvider(providerId);
    setConnecting(true);

    if (providerId === 'calcom' && user) {
      try {
        await initiateCalcomOAuth(user);
        // Execution stops here due to browser navigation
        // User flow continues in Cal.com OAuth interface
        // Return happens to /profile after successful authorization
        
      } catch (error) {
        console.error('[CalendarModal] Error connecting to Cal.com:', error);
        toast({
          title: "Verbinding Mislukt",
          description: "Kon niet verbinden met Cal.com",
          variant: "destructive",
        });
        
        setConnecting(false);
        setSelectedProvider(null);
      }
    } else {
      toast({
        title: "Provider Niet Ondersteund",
        description: `${providerId} is momenteel niet beschikbaar`,
        variant: "destructive",
      });
      
      setConnecting(false);
      setSelectedProvider(null);
    }
  };

  const handleComplete = () => {
    console.log('[CalendarModal] Integration completed');
    
    setSelectedProvider(null);
    setConnecting(false);
    
    onComplete?.();
  };

  const handleModalClose = (open: boolean) => {
    if (!connecting) {
      setSelectedProvider(null);
      setConnecting(false);
      onOpenChange(open);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleModalClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cal.com Verbinden</DialogTitle>
          <DialogDescription>
            Verbind je Cal.com account voor automatische booking synchronisatie en 24/7 WhatsApp ondersteuning
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {!selectedProvider ? (
            <CalendarProviderSelector
              onProviderSelect={handleProviderSelect}
              connecting={connecting}
            />
          ) : (
            <CalendarIntegrationSteps
              provider={selectedProvider}
              onComplete={handleComplete}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
