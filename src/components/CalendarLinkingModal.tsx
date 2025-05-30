
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CalendarLinkingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CalendarLinkingModal = ({ open, onOpenChange, onSuccess }: CalendarLinkingModalProps) => {
  const [connecting, setConnecting] = useState(false);
  const { toast } = useToast();

  const handleGoogleCalendarConnect = async () => {
    setConnecting(true);
    
    try {
      console.log('[CalendarLinkingModal] Starting Google Calendar connection...');
      
      // Generate OAuth URL with proper parameters
      const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      oauthUrl.searchParams.set('client_id', '7344737510-1846vbrgkq4ac0e1ehrjg1dlg001o56.apps.googleusercontent.com');
      oauthUrl.searchParams.set('redirect_uri', 'https://qzetadfdmsholqyxxfbh.supabase.co/auth/v1/callback');
      oauthUrl.searchParams.set('response_type', 'code');
      oauthUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar');
      oauthUrl.searchParams.set('access_type', 'offline');
      oauthUrl.searchParams.set('prompt', 'consent');
      oauthUrl.searchParams.set('state', `calendar_connect_${Date.now()}`);

      console.log('[CalendarLinkingModal] Redirecting to Google OAuth:', oauthUrl.toString());

      // Store connection attempt in sessionStorage to handle callback
      sessionStorage.setItem('calendar_connect_attempt', 'true');
      sessionStorage.setItem('calendar_connect_time', Date.now().toString());

      // Redirect to Google OAuth
      window.location.href = oauthUrl.toString();

    } catch (error: any) {
      console.error('[CalendarLinkingModal] Connection error:', error);
      setConnecting(false);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Google Calendar",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-green-600" />
            Link Your Google Calendar
          </DialogTitle>
          <DialogDescription>
            Connect your Google Calendar to enable automatic booking synchronization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Automatic Sync</p>
                <p className="text-sm text-gray-600">Your calendar events will sync automatically</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Real-time Updates</p>
                <p className="text-sm text-gray-600">Changes appear instantly on your dashboard</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Secure Connection</p>
                <p className="text-sm text-gray-600">Your data is protected with OAuth 2.0</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleGoogleCalendarConnect}
              disabled={connecting}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {connecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect Google Calendar
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={connecting}
            >
              Later
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            You'll be redirected to Google to authorize calendar access.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
