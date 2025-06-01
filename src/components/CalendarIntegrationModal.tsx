
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

        // Create a unique state parameter using user ID and timestamp
        const state = `${user.id}-${Date.now()}`;
        
        // Use the correct Supabase callback URL that matches our configuration
        const redirectUri = 'https://qzetadfdmsholqyxxfbh.supabase.co/auth/v1/callback';
        const clientId = '7344737510-1846vbrgkq4ac0e1ehrjg1dlg001o56.apps.googleusercontent.com';
        
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${clientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code&` +
          `scope=${encodeURIComponent('https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email')}&` +
          `state=${state}&` +
          `access_type=offline&` +
          `prompt=consent`;

        console.log('[CalendarModal] Redirecting to Google OAuth with state:', state);
        
        // Store the state in localStorage so we can verify it on return
        localStorage.setItem('oauth_state', state);
        localStorage.setItem('oauth_user_id', user.id);
        
        window.location.href = googleAuthUrl;
        
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
