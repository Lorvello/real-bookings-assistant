
/**
 * 🔥 NUCLEAR DISCONNECT BUTTON - No Mercy Calendar Disconnect
 * ==========================================================
 * 
 * Deze button doet wat hij belooft: IMMEDIATE, COMPLETE, NUCLEAR disconnect.
 * Geen confirmation dialogs, geen "are you sure", gewoon BOOM - weg.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { forceDisconnectAllCalendars, forceUIRefresh } from '@/utils/calendar/forceDisconnect';

interface NuclearDisconnectButtonProps {
  onSuccess?: () => void;
}

export const NuclearDisconnectButton: React.FC<NuclearDisconnectButtonProps> = ({
  onSuccess
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [nuking, setNuking] = useState(false);

  /**
   * 🔥 NUCLEAR DISCONNECT - Geen genade, geen mercy
   */
  const handleNuclearDisconnect = async () => {
    if (!user) {
      toast({
        title: "Geen Gebruiker",
        description: "Log eerst in om kalender te kunnen loskoppelen",
        variant: "destructive",
      });
      return;
    }

    console.log('[NuclearDisconnect] USER TRIGGERED NUCLEAR DISCONNECT');
    setNuking(true);

    try {
      // 🚨 Execute nuclear disconnect
      const success = await forceDisconnectAllCalendars(user);
      
      if (success) {
        // ✅ SUCCESS - Show immediate feedback
        toast({
          title: "🔥 KALENDER VERNIETIGD",
          description: "Google Calendar is volledig losgekoppeld. Pagina wordt ververst...",
          duration: 3000,
        });
        
        console.log('[NuclearDisconnect] SUCCESS - Calendar completely nuked');
        
        // 🔄 Trigger callback voor parent component
        if (onSuccess) {
          onSuccess();
        }
        
        // 🔄 Force immediate UI refresh
        forceUIRefresh();
        
      } else {
        // ❌ FAILURE
        toast({
          title: "🚨 NUCLEAR DISCONNECT GEFAALD",
          description: "Er ging iets mis tijdens het forceren van de disconnect. Probeer opnieuw.",
          variant: "destructive",
        });
        console.error('[NuclearDisconnect] Nuclear disconnect failed');
        setNuking(false);
      }
    } catch (error) {
      // 🚨 UNEXPECTED ERROR
      console.error('[NuclearDisconnect] Unexpected error:', error);
      toast({
        title: "🚨 ONVERWACHTE FOUT",
        description: "Er trad een kritieke fout op tijdens nuclear disconnect.",
        variant: "destructive",
      });
      setNuking(false);
    }
  };

  return (
    <Button
      onClick={handleNuclearDisconnect}
      disabled={nuking}
      variant="destructive"
      className="bg-red-600 hover:bg-red-700 text-white font-bold"
    >
      {nuking ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          VERNIETIGEN...
        </>
      ) : (
        <>
          <Trash2 className="h-4 w-4 mr-2" />
          🔥 KALENDER VERNIETIGEN
        </>
      )}
    </Button>
  );
};
