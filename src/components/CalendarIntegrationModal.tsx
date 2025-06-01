
/**
 * 🎭 CALENDAR INTEGRATION MODAL - FIXED OAUTH
 * ==========================================
 * 
 * Fixed modal with correct OAuth configuration for Google Calendar
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CalendarProviderSelector } from '@/components/calendar/CalendarProviderSelector';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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

  const handleProviderSelect = async (providerId: string) => {
    console.log('[CalendarModal] Provider selected:', providerId);
    setConnecting(true);

    if (providerId === 'google') {
      try {
        if (!user) {
          toast({
            title: "Niet Ingelogd",
            description: "Je moet ingelogd zijn om een kalender te verbinden",
            variant: "destructive",
          });
          setConnecting(false);
          return;
        }

        // Use the Google Calendar OAuth flow
        const { data, error } = await supabase.functions.invoke('google-calendar-connect', {
          body: { user_id: user.id }
        });

        if (error) {
          console.error('[CalendarModal] Google Calendar connect error:', error);
          toast({
            title: "Verbinding Mislukt",
            description: "Kon niet verbinden met Google Calendar",
            variant: "destructive",
          });
          setConnecting(false);
          return;
        }

        if (data?.auth_url) {
          console.log('[CalendarModal] Redirecting to Google OAuth:', data.auth_url);
          window.location.href = data.auth_url;
        } else {
          console.error('[CalendarModal] No auth URL received');
          toast({
            title: "Verbinding Mislukt",
            description: "Geen autorisatie URL ontvangen",
            variant: "destructive",
          });
          setConnecting(false);
        }
        
      } catch (error) {
        console.error('[CalendarModal] Error setting up Google OAuth:', error);
        toast({
          title: "Verbinding Mislukt",
          description: "Kon niet verbinden met Google Calendar",
          variant: "destructive",
        });
        setConnecting(false);
      }
    } else {
      toast({
        title: "Binnenkort Beschikbaar",
        description: `${providerId} kalender integratie komt binnenkort`,
      });
      setConnecting(false);
    }
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
          <DialogTitle>Kalender Verbinden</DialogTitle>
          <DialogDescription>
            Kies je kalender provider om automatisch je beschikbaarheid te synchroniseren
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <CalendarProviderSelector
            onProviderSelect={handleProviderSelect}
            connecting={connecting}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
