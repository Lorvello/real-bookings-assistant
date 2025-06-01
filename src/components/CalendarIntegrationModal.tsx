
/**
 * 🎭 CALENDAR INTEGRATION MODAL - SIMPLIFIED
 * ==========================================
 * 
 * Simplified modal that only handles calendar provider selection
 * and redirects. No longer manages multiple states or steps.
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

        // Create a pending connection first
        const { data: connection, error: connectionError } = await supabase
          .from('calendar_connections')
          .insert({
            user_id: user.id,
            provider: 'google',
            provider_account_id: 'pending',
            is_active: false
          })
          .select()
          .single();

        if (connectionError) {
          console.error('[CalendarModal] Error creating pending connection:', connectionError);
          toast({
            title: "Fout",
            description: "Kon geen kalender verbinding maken",
            variant: "destructive",
          });
          setConnecting(false);
          return;
        }

        // Use the connection ID as state parameter
        const state = connection.id;
        const redirectUri = `${window.location.origin}/auth/callback`;
        const clientId = '7344737510-1846vbrgkq4ac0e1ehrjg1dlg001o56.apps.googleusercontent.com';
        
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${clientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code&` +
          `scope=${encodeURIComponent('https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email')}&` +
          `state=${state}&` +
          `access_type=offline&` +
          `prompt=consent`;

        console.log('[CalendarModal] Redirecting to Google OAuth...');
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
