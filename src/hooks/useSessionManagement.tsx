import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useSessionManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSessionExpiration = useCallback(() => {
    toast({
      title: "Session Expired",
      description: "Your session has expired. Please sign in again.",
      variant: "destructive",
    });
    
    // Clear any local storage or cached data
    localStorage.removeItem('lastActiveTime');
    
    // Navigate to login with a message
    navigate('/login', { 
      state: { 
        message: 'Your session has expired. Please sign in again.',
        returnUrl: window.location.pathname 
      }
    });
  }, [navigate, toast]);

  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('[SessionManagement] Refresh error:', error);
        handleSessionExpiration();
        return false;
      }

      if (!session) {
        console.warn('[SessionManagement] No session after refresh');
        handleSessionExpiration();
        return false;
      }

      console.log('[SessionManagement] Session refreshed successfully');
      return true;
    } catch (error) {
      console.error('[SessionManagement] Unexpected refresh error:', error);
      handleSessionExpiration();
      return false;
    }
  }, [handleSessionExpiration]);

  const checkSessionValidity = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[SessionManagement] Session check error:', error);
        return false;
      }

      if (!session) {
        return false;
      }

      // Check if token is close to expiration (refresh 5 minutes before)
      const expiresAt = session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt - now;
      
      if (timeUntilExpiry < 300) { // 5 minutes
        console.log('[SessionManagement] Token close to expiration, refreshing...');
        return await refreshSession();
      }

      return true;
    } catch (error) {
      console.error('[SessionManagement] Session validity check error:', error);
      return false;
    }
  }, [refreshSession]);

  // Handle network connectivity
  const handleOnlineStatus = useCallback(() => {
    if (navigator.onLine) {
      console.log('[SessionManagement] Back online, checking session...');
      checkSessionValidity();
    }
  }, [checkSessionValidity]);

  // Track user activity for idle session handling
  const updateLastActiveTime = useCallback(() => {
    localStorage.setItem('lastActiveTime', Date.now().toString());
  }, []);

  const checkIdleTimeout = useCallback(async () => {
    const lastActiveTime = localStorage.getItem('lastActiveTime');
    if (!lastActiveTime) return;

    const idleTime = Date.now() - parseInt(lastActiveTime);
    const maxIdleTime = 4 * 60 * 60 * 1000; // 4 hours

    if (idleTime > maxIdleTime) {
      toast({
        title: "Session Timeout",
        description: "You've been signed out due to inactivity.",
      });
      
      await supabase.auth.signOut();
      navigate('/login');
    }
  }, [navigate, toast]);

  useEffect(() => {
    // Set up session monitoring
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[SessionManagement] Auth state change:', event);
        
        if (event === 'SIGNED_OUT') {
          localStorage.removeItem('lastActiveTime');
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          updateLastActiveTime();
        } else if (event === 'USER_UPDATED') {
          updateLastActiveTime();
        }
      }
    );

    // Set up activity tracking
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const throttledUpdateActivity = (() => {
      let lastUpdate = 0;
      return () => {
        const now = Date.now();
        if (now - lastUpdate > 60000) { // Update at most once per minute
          updateLastActiveTime();
          lastUpdate = now;
        }
      };
    })();

    activityEvents.forEach(event => {
      document.addEventListener(event, throttledUpdateActivity, true);
    });

    // Set up online/offline handling
    window.addEventListener('online', handleOnlineStatus);

    // Set up periodic session checks
    const sessionCheckInterval = setInterval(checkSessionValidity, 5 * 60 * 1000); // Every 5 minutes
    
    // Set up idle timeout checks
    const idleCheckInterval = setInterval(checkIdleTimeout, 60 * 1000); // Every minute

    // Initial session check
    checkSessionValidity();

    return () => {
      subscription.unsubscribe();
      
      activityEvents.forEach(event => {
        document.removeEventListener(event, throttledUpdateActivity, true);
      });
      
      window.removeEventListener('online', handleOnlineStatus);
      clearInterval(sessionCheckInterval);
      clearInterval(idleCheckInterval);
    };
  }, [checkSessionValidity, checkIdleTimeout, handleOnlineStatus, updateLastActiveTime]);

  return {
    refreshSession,
    checkSessionValidity,
    handleSessionExpiration
  };
};