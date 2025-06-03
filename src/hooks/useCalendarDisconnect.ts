
/**
 * 🔌 CALENDAR DISCONNECT HOOK
 * ===========================
 * 
 * Custom hook for handling calendar disconnection logic and state management.
 */

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { disconnectCalcomProvider } from '@/utils/calendar/connectionDisconnect';

interface UseCalendarDisconnectProps {
  user: User | null;
  connectionId: string;
  providerName: string;
  onDisconnectSuccess?: () => void;
}

export const useCalendarDisconnect = ({
  user,
  connectionId,
  providerName,
  onDisconnectSuccess
}: UseCalendarDisconnectProps) => {
  const [disconnecting, setDisconnecting] = useState(false);
  const { toast } = useToast();

  const handleDisconnect = async () => {
    if (!user) {
      console.error('[CalendarDisconnect] No user available for disconnect');
      toast({
        title: "Fout",
        description: "Geen gebruiker gevonden. Probeer opnieuw in te loggen.",
        variant: "destructive",
      });
      return;
    }

    console.log(`[CalendarDisconnect] Starting disconnect for: ${connectionId} (${providerName})`);
    setDisconnecting(true);
    
    try {
      const success = await disconnectCalcomProvider(user, connectionId);
      
      if (success) {
        toast({
          title: "Kalender Losgekoppeld",
          description: `${providerName} kalender is succesvol losgekoppeld. Je kunt altijd opnieuw verbinden.`,
          duration: 5000,
        });
        
        console.log(`[CalendarDisconnect] Successfully disconnected ${providerName}`);
        
        if (onDisconnectSuccess) {
          onDisconnectSuccess();
        }
      } else {
        toast({
          title: "Disconnect Mislukt", 
          description: `Kon ${providerName} kalender niet loskoppelen. Controleer je internetverbinding en probeer het opnieuw.`,
          variant: "destructive",
        });
        console.error(`[CalendarDisconnect] Failed to disconnect ${providerName}`);
      }
    } catch (error) {
      console.error('[CalendarDisconnect] Error during disconnect:', error);
      toast({
        title: "Onverwachte Fout",
        description: `Er ging iets mis bij het loskoppelen van ${providerName}. Probeer het later opnieuw.`,
        variant: "destructive",
      });
    } finally {
      setDisconnecting(false);
    }
  };

  return {
    disconnecting,
    handleDisconnect
  };
};
