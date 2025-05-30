
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useCalendarLinking = (user: User | null) => {
  const [showLinkingModal, setShowLinkingModal] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Check if user has active calendar connection
  const checkCalendarConnection = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('calendar_connections')
        .select('id, is_active')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[CalendarLinking] Error checking connection:', error);
        setLoading(false);
        return;
      }

      const connected = !!data;
      setIsConnected(connected);

      // Show modal if not connected and not already shown recently
      if (!connected) {
        const lastShown = localStorage.getItem('calendar_modal_last_shown');
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        if (!lastShown || (now - parseInt(lastShown)) > oneDay) {
          setTimeout(() => {
            setShowLinkingModal(true);
            localStorage.setItem('calendar_modal_last_shown', now.toString());
          }, 2000); // Show after 2 seconds
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('[CalendarLinking] Unexpected error:', error);
      setLoading(false);
    }
  };

  // Handle OAuth callback from Google
  const handleOAuthCallback = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    // Check if this is a calendar connection attempt
    const isCalendarConnect = sessionStorage.getItem('calendar_connect_attempt');
    
    if (!isCalendarConnect || !code || error) {
      if (error) {
        console.error('[CalendarLinking] OAuth error:', error);
        toast({
          title: "Connection Failed",
          description: "Calendar connection was cancelled or failed",
          variant: "destructive",
        });
      }
      // Clean up session storage
      sessionStorage.removeItem('calendar_connect_attempt');
      sessionStorage.removeItem('calendar_connect_time');
      return;
    }

    try {
      console.log('[CalendarLinking] Processing OAuth callback...');

      const { data, error: invokeError } = await supabase.functions.invoke('google-calendar-connect', {
        body: { code }
      });

      if (invokeError) {
        console.error('[CalendarLinking] Calendar connect error:', invokeError);
        toast({
          title: "Connection Failed",
          description: "Failed to connect Google Calendar. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data.success) {
        console.log('[CalendarLinking] Calendar connected successfully');
        toast({
          title: "Calendar Connected!",
          description: "Your Google Calendar has been linked successfully",
        });
        
        setIsConnected(true);
        setShowLinkingModal(false);
        
        // Refresh the page to update dashboard
        setTimeout(() => {
          window.location.replace('/profile');
        }, 1000);
      }

    } catch (error: any) {
      console.error('[CalendarLinking] Callback processing error:', error);
      toast({
        title: "Connection Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      // Clean up session storage
      sessionStorage.removeItem('calendar_connect_attempt');
      sessionStorage.removeItem('calendar_connect_time');
      
      // Clean up URL parameters
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  };

  useEffect(() => {
    if (user) {
      checkCalendarConnection();
      
      // Handle OAuth callback if present
      if (window.location.search.includes('code=')) {
        handleOAuthCallback();
      }
    }
  }, [user]);

  const handleLinkingSuccess = () => {
    setShowLinkingModal(false);
    setIsConnected(true);
    checkCalendarConnection(); // Refresh connection status
  };

  return {
    showLinkingModal,
    setShowLinkingModal,
    isConnected,
    loading,
    handleLinkingSuccess,
    refetchConnection: checkCalendarConnection
  };
};
