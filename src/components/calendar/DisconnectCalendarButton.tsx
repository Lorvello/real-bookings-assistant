
/**
 * 🔌 DISCONNECT CALENDAR BUTTON COMPONENT
 * =======================================
 * 
 * 🎯 AFFABLE BOT CONTEXT:
 * Deze component biedt gebruikers een veilige manier om hun Google Calendar koppeling 
 * te verbreken. Onderdeel van het autonome booking systeem waar calendar sync 
 * essentieel is voor real-time beschikbaarheid.
 * 
 * 🚀 BUSINESS CRITICAL FUNCTIONS:
 * - Veilige token cleanup en database updates
 * - Clear user feedback over disconnect status
 * - Automatic UI state updates na disconnect
 * - Graceful degradation naar re-onboarding flow
 * 
 * 🎪 SYSTEM INTEGRATION:
 * - Gebruikt bestaande disconnectCalendarProvider utility
 * - Integreert met setup progress tracking
 * - Triggert automatic UI refreshes
 * - Toont alleen wanneer kalender gekoppeld is
 * 
 * 💡 SUCCESS METRICS CONTRIBUTION:
 * - Clear disconnect flow voorkomt user confusion
 * - Quick re-connection mogelijk voor betere retention
 * - Proper cleanup voorkomt data inconsistenties
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Unlink, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { disconnectCalendarProvider } from '@/utils/calendar/connectionDisconnect';
import { User } from '@supabase/supabase-js';

interface DisconnectCalendarButtonProps {
  user: User | null;
  connectionId: string;
  providerName: string;
  onDisconnectSuccess?: () => void;
  variant?: 'destructive' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  showConfirmation?: boolean;
}

/**
 * 🎮 Component voor veilige calendar disconnect functionaliteit
 * 
 * FEATURES:
 * - Optional confirmation dialog voor accident prevention
 * - Loading states tijdens disconnect process
 * - Success/error feedback via toast notifications
 * - Flexible styling voor verschillende use cases
 * - Automatic callback triggering voor parent component updates
 * 
 * SAFETY MEASURES:
 * - Confirmation prompt voorkomt accidental disconnects
 * - Disabled state tijdens process voor double-click prevention
 * - Clear error messaging voor troubleshooting
 * - Graceful handling van edge cases
 */
export const DisconnectCalendarButton: React.FC<DisconnectCalendarButtonProps> = ({
  user,
  connectionId,
  providerName,
  onDisconnectSuccess,
  variant = 'outline',
  size = 'sm',
  showConfirmation = true
}) => {
  const [disconnecting, setDisconnecting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { toast } = useToast();

  /**
   * 🔥 Handelt calendar disconnect process af
   * 
   * WORKFLOW:
   * 1. Set loading state voor UI feedback
   * 2. Call disconnect utility met proper error handling
   * 3. Show success/error toast met clear messaging
   * 4. Trigger callback voor parent component refresh
   * 5. Reset confirmation state voor clean UX
   */
  const handleDisconnect = async () => {
    if (!user) {
      console.error('[DisconnectButton] No user available for disconnect');
      toast({
        title: "Fout",
        description: "Geen gebruiker gevonden. Probeer opnieuw in te loggen.",
        variant: "destructive",
      });
      return;
    }

    console.log(`[DisconnectButton] Starting disconnect for: ${connectionId} (${providerName})`);
    setDisconnecting(true);
    
    try {
      // 🔌 Execute disconnect via existing utility function
      const success = await disconnectCalendarProvider(user, connectionId);
      
      if (success) {
        // ✅ SUCCESS FEEDBACK
        toast({
          title: "Kalender Losgekoppeld",
          description: `${providerName} kalender is succesvol losgekoppeld. Je kunt altijd opnieuw verbinden.`,
          duration: 5000,
        });
        
        console.log(`[DisconnectButton] Successfully disconnected ${providerName}`);
        
        // 🔄 Trigger parent component refresh
        if (onDisconnectSuccess) {
          onDisconnectSuccess();
        }
      } else {
        // ❌ FAILURE FEEDBACK
        toast({
          title: "Disconnect Mislukt", 
          description: `Kon ${providerName} kalender niet loskoppelen. Controleer je internetverbinding en probeer het opnieuw.`,
          variant: "destructive",
        });
        console.error(`[DisconnectButton] Failed to disconnect ${providerName}`);
      }
    } catch (error) {
      // 🚨 ERROR HANDLING
      console.error('[DisconnectButton] Error during disconnect:', error);
      toast({
        title: "Onverwachte Fout",
        description: `Er ging iets mis bij het loskoppelen van ${providerName}. Probeer het later opnieuw.`,
        variant: "destructive",
      });
    } finally {
      setDisconnecting(false);
      setShowConfirm(false);
    }
  };

  /**
   * 🛡️ Handles initial click met optional confirmation
   * 
   * LOGIC:
   * - Als confirmation disabled: direct disconnect
   * - Anders: toon confirmation dialog eerst
   */
  const handleInitialClick = () => {
    if (showConfirmation) {
      setShowConfirm(true);
    } else {
      handleDisconnect();
    }
  };

  // 🎨 RENDER CONFIRMATION DIALOG
  if (showConfirm) {
    return (
      <div className="space-y-3">
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Kalender Loskoppelen</strong><br />
            Je {providerName} kalender wordt losgekoppeld. Dit betekent dat:
            <ul className="mt-2 ml-4 list-disc space-y-1 text-sm">
              <li>Automatische booking sync wordt uitgeschakeld</li>
              <li>WhatsApp bot kan geen beschikbaarheid meer controleren</li>
              <li>Je kunt altijd opnieuw verbinden via instellingen</li>
            </ul>
          </AlertDescription>
        </Alert>
        
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="flex-1"
          >
            {disconnecting ? (
              <>
                <Unlink className="h-4 w-4 mr-2 animate-pulse" />
                Loskoppelen...
              </>
            ) : (
              <>
                <Unlink className="h-4 w-4 mr-2" />
                Ja, Loskoppelen
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfirm(false)}
            disabled={disconnecting}
            className="flex-1"
          >
            Annuleren
          </Button>
        </div>
      </div>
    );
  }

  // 🎨 RENDER MAIN DISCONNECT BUTTON
  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleInitialClick}
      disabled={disconnecting}
      className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      {disconnecting ? (
        <>
          <Unlink className="h-4 w-4 mr-2 animate-pulse" />
          Loskoppelen...
        </>
      ) : (
        <>
          <Unlink className="h-4 w-4 mr-2" />
          Loskoppelen
        </>
      )}
    </Button>
  );
};

/**
 * 🎯 AFFABLE BOT SYSTEM NOTES:
 * ============================
 * 
 * Deze component is cruciaal voor gebruikersbeheer in het autonome booking systeem.
 * Wanneer kalenders worden losgekoppeld, moet het systeem gracieus degraderen naar
 * een setup-required staat in plaats van in een broken state te blijven.
 * 
 * KEY BUSINESS IMPACT:
 * - Calendar disconnect = WhatsApp bot wordt uitgeschakeld
 * - Users kunnen opnieuw verbinden voor immediate reactivation
 * - Clean disconnect voorkomt data corruption issues
 * - Clear messaging reduceert support burden
 * 
 * INTEGRATION DEPENDENCIES:
 * - disconnectCalendarProvider: Core cleanup functionaliteit
 * - Setup Progress: Automatic reset naar onboarding state
 * - Dashboard Components: Conditional rendering op connection status
 * - WhatsApp Bot: Fails gracefully zonder calendar connections
 * 
 * UX DESIGN PRINCIPLES:
 * - Confirmation prevents accidental disconnects
 * - Clear consequences messaging sets expectations
 * - Quick re-connection path maintains user engagement
 * - Progressive disclosure keeps interface clean
 */
