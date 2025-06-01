
/**
 * 🎭 CALENDAR INTEGRATION MODAL
 * =============================
 * 
 * 🎯 AFFABLE BOT CONTEXT:
 * Dit modal component orkestreert de complete OAuth flow voor externe kalender verbindingen.
 * Het is de primary entry point voor nieuwe gebruikers om het autonome booking systeem
 * te activeren door hun kalender te koppelen voor realtime beschikbaarheidscontrole.
 * 
 * 🚀 BUSINESS CRITICAL FUNCTIONS:
 * - Guided OAuth setup voor Google Calendar integration
 * - Provider selection interface voor toekomstige multi-provider support
 * - Seamless redirect handling naar Supabase OAuth endpoints
 * - Progress tracking en user feedback tijdens connection process
 * 
 * 🎪 SYSTEM INTEGRATION POINTS:
 * - Setup Progress Card: Triggered vanuit setup workflow
 * - Dashboard widgets: Calendar management en troubleshooting
 * - OAuth flow: Redirects naar Supabase Auth voor secure token exchange
 * - Connection hooks: Integration met real-time connection status
 * 
 * 💡 SUCCESS METRICS CONTRIBUTION:
 * - Streamlined setup contributes naar 100% activatie binnen 3 minuten
 * - Clear provider selection vermindert user confusion en drop-off
 * - Error handling voorkomt support tickets (< 5% per maand target)
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
import { CalendarIntegrationSteps } from '@/components/calendar/CalendarIntegrationSteps';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface CalendarIntegrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

/**
 * 🎮 Main modal component voor calendar integration workflow
 * 
 * FEATURES:
 * - Provider selection interface (Google, Microsoft, future providers)
 * - OAuth redirect orchestration via Supabase Auth
 * - Connection status tracking en user feedback
 * - Modal state management met loading protection
 * - Completion callbacks voor parent component integration
 * 
 * WORKFLOW STATES:
 * 1. Provider Selection: User kiest Google/Microsoft/etc
 * 2. Connecting: OAuth redirect in progress (loading state)
 * 3. Integration Steps: Post-connection guidance (future feature)
 * 4. Completion: Success callback en modal close
 * 
 * @param open - Modal visibility state controlled by parent
 * @param onOpenChange - Modal close callback voor parent state management
 * @param onComplete - Optional completion callback voor post-setup actions
 */
export const CalendarIntegrationModal: React.FC<CalendarIntegrationModalProps> = ({
  open,
  onOpenChange,
  onComplete
}) => {
  // 🔐 AUTHENTICATION & UTILITIES
  const { user } = useAuth();
  const { toast } = useToast();
  
  // 📊 MODAL STATE MANAGEMENT
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null); // Currently selected provider
  const [connecting, setConnecting] = useState(false);                          // OAuth flow in progress

  /**
   * 🎯 Handles provider selection en OAuth flow initiation
   * 
   * GOOGLE OAUTH FLOW:
   * 1. Set connecting state voor loading UI
   * 2. Construct Supabase OAuth URL met redirect parameters
   * 3. Navigate browser naar Google OAuth consent screen
   * 4. User authorizes in Google interface
   * 5. Google redirects back naar Supabase Auth
   * 6. Supabase processes tokens en redirects naar /profile
   * 7. Connection hooks detecteren nieuwe connection en update UI
   * 
   * OTHER PROVIDERS:
   * - Microsoft: Placeholder implementation voor future development
   * - Apple, Outlook: Framework ready voor easy addition
   * 
   * ERROR HANDLING:
   * - Invalid providers: User feedback via toast
   * - OAuth failures: Browser error pages, graceful recovery
   * - Network issues: Toast notifications met retry guidance
   * 
   * @param providerId - Provider identifier (google, microsoft, apple, etc.)
   */
  const handleProviderSelect = async (providerId: string) => {
    console.log('[CalendarModal] Provider selected:', providerId);
    setSelectedProvider(providerId);
    setConnecting(true);

    if (providerId === 'google') {
      try {
        // 🌐 GOOGLE OAUTH REDIRECT
        // Construct Supabase OAuth URL met Google provider
        // redirect_to parameter zorgt voor return naar /profile na success
        const redirectUrl = `https://qzetadfdmsholqyxxfbh.supabase.co/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(window.location.origin + '/profile')}`;
        
        // 🚀 Navigate naar Google OAuth consent screen
        window.location.href = redirectUrl;
        
        // Note: Execution stopt hier door browser navigation
        // User flow continues in Google OAuth interface
        // Return gebeurt naar /profile na successful authorization
        
      } catch (error) {
        // 🚨 OAUTH SETUP ERROR
        console.error('[CalendarModal] Error connecting to Google:', error);
        toast({
          title: "Verbinding Mislukt",
          description: "Kon niet verbinden met Google Calendar",
          variant: "destructive",
        });
        
        // 🔄 Reset state voor retry capability
        setConnecting(false);
        setSelectedProvider(null);
      }
    } else {
      // 🚧 OTHER PROVIDERS: Placeholder voor future development
      toast({
        title: "Binnenkort Beschikbaar",
        description: `${providerId} kalender integratie komt binnenkort`,
      });
      
      // 🔄 Reset state na placeholder message
      setConnecting(false);
      setSelectedProvider(null);
    }
  };

  /**
   * 🎉 Handles completion van integration workflow
   * 
   * COMPLETION LOGIC:
   * - Reset alle internal modal state
   * - Trigger optional completion callback voor parent component
   * - Close modal voor return naar dashboard
   * 
   * USAGE:
   * - Called na successful OAuth completion (future feature)
   * - Called na guided setup steps completion
   * - Triggers dashboard refresh en progress updates
   */
  const handleComplete = () => {
    console.log('[CalendarModal] Integration completed');
    
    // 🧹 Clean up modal state
    setSelectedProvider(null);
    setConnecting(false);
    
    // 📞 Notify parent component van completion
    onComplete?.();
  };

  /**
   * 🚪 Handles modal close met connection state protection
   * 
   * CLOSE PROTECTION:
   * - Prevent modal close during active OAuth flow
   * - Allows close alleen in stable states
   * - Cleans up internal state bij successful close
   * 
   * USER EXPERIENCE:
   * - Prevents accidental interruption van OAuth process
   * - Maintains state consistency tussen open/close cycles
   * - Clear state reset voor fresh modal opens
   * 
   * @param open - New modal visibility state
   */
  const handleModalClose = (open: boolean) => {
    // 🔒 Prevent close tijdens active OAuth flow
    if (!connecting) {
      // 🧹 Clean up state bij modal close
      setSelectedProvider(null);
      setConnecting(false);
      
      // 📞 Notify parent van state change
      onOpenChange(open);
    }
    // Else: silently ignore close attempts tijdens connecting state
  };

  // 🎨 MAIN MODAL RENDER
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
            // 🎯 STEP 1: Provider Selection Interface
            <CalendarProviderSelector
              onProviderSelect={handleProviderSelect}
              connecting={connecting}
            />
          ) : (
            // 🎯 STEP 2: Integration Steps Interface (future feature)
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

/**
 * 🎯 AFFABLE BOT SYSTEM NOTES:
 * ============================
 * 
 * Dit modal is de gateway naar calendar integration en daarmee de activatie van het
 * autonome booking systeem. Het moet een frictionless experience bieden om de
 * 100% activatie binnen 3 minuten target te halen.
 * 
 * CRITICAL SUCCESS FACTORS:
 * - Fast OAuth redirect (< 5 sec) voor immediate provider authentication
 * - Clear provider selection om user confusion te minimaliseren
 * - Reliable error handling om OAuth failures gracefully te verwerken
 * - Loading states om perceived performance te verbeteren tijdens redirects
 * 
 * OAUTH FLOW ARCHITECTURE:
 * 1. User selecteert provider in modal interface
 * 2. Modal redirects naar Supabase OAuth endpoint met provider parameter
 * 3. Supabase redirects naar provider OAuth consent screen
 * 4. User authorizes application in provider interface
 * 5. Provider redirects terug naar Supabase met authorization code
 * 6. Supabase exchanges code voor access/refresh tokens
 * 7. Supabase creates calendar_connection record in database
 * 8. Supabase redirects user terug naar /profile page
 * 9. Dashboard hooks detecteren nieuwe connection en update UI
 * 
 * FUTURE DEVELOPMENT READY:
 * - Microsoft OAuth: Framework klaar voor implementation
 * - Apple Calendar: Provider structure supports addition
 * - Custom providers: Extensible design voor enterprise integrations
 * - Advanced settings: Provider-specific configuration options
 * 
 * BUSINESS VALUE:
 * - Enables core system functionality (calendar-based availability)
 * - Reduces onboarding friction voor higher completion rates
 * - Supports future multi-provider strategy voor market expansion
 * - Provides foundation voor advanced calendar features
 */
