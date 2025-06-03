
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  const [connecting, setConnecting] = useState(false);

  const handleComplete = () => {
    console.log('[CalendarModal] Cal.com integration completed');
    
    setConnecting(false);
    
    toast({
      title: "Cal.com Geconfigureerd!",
      description: "Je Cal.com account is succesvol aangemaakt en gekoppeld",
    });
    
    onComplete?.();
    onOpenChange(false);
  };

  const handleModalClose = (open: boolean) => {
    if (!connecting) {
      setConnecting(false);
      onOpenChange(open);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleModalClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cal.com Integratie</DialogTitle>
          <DialogDescription>
            Stel je Cal.com account in voor automatische booking synchronisatie en 24/7 WhatsApp ondersteuning
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <CalendarIntegrationSteps onComplete={handleComplete} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
