
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

    if (providerId === 'google') {
      try {
        // Navigate to Google OAuth
        const redirectUrl = `https://qzetadfdmsholqyxxfbh.supabase.co/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(window.location.origin + '/profile')}`;
        window.location.href = redirectUrl;
      } catch (error) {
        console.error('[CalendarModal] Error connecting to Google:', error);
        toast({
          title: "Verbinding Mislukt",
          description: "Kon niet verbinden met Google Calendar",
          variant: "destructive",
        });
        setConnecting(false);
        setSelectedProvider(null);
      }
    } else {
      toast({
        title: "Binnenkort Beschikbaar",
        description: `${providerId} kalender integratie komt binnenkort`,
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
          <DialogTitle>Kalender Verbinden</DialogTitle>
          <DialogDescription>
            Kies je kalender provider om automatisch je beschikbaarheid te synchroniseren
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
