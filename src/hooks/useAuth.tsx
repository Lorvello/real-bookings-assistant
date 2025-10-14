
import { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import { checkAuthRateLimit } from '@/utils/rateLimiter';
import { generateDeviceFingerprint, DeviceFingerprint } from '@/utils/deviceFingerprint';
import { SessionManager } from '@/utils/sessionManager';
import { SuspiciousLoginDetector } from '@/utils/suspiciousLoginDetector';
import { checkPasswordExpiry } from '@/utils/passwordPolicy';
import { SecurityLogger } from '@/utils/securityLogger';
import { useNavigate } from 'react-router-dom';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [deviceFingerprint, setDeviceFingerprint] = useState<DeviceFingerprint | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Initialize device fingerprinting on mount
  useEffect(() => {
    generateDeviceFingerprint().then(fp => setDeviceFingerprint(fp));
  }, []);

  // Session timeout (30 minutes)
  useEffect(() => {
    if (!session) return;

    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    let timeoutId: NodeJS.Timeout;

    const resetTimeout = () => {
      if (timeoutId) clearTimeout(timeoutId);
      
      timeoutId = setTimeout(async () => {
        toast({
          title: "Session Expired",
          description: "Your session has expired due to inactivity. Please sign in again.",
          variant: "destructive",
        });
        await supabase.auth.signOut();
      }, SESSION_TIMEOUT);
    };

    // Activity listeners
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const handleActivity = () => {
      resetTimeout();
      // Update session activity in database
      const sessionToken = sessionStorage.getItem('session_token');
      if (sessionToken) {
        SessionManager.updateSessionActivity(sessionToken);
      }
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    resetTimeout(); // Initial timeout

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [session, toast]);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        // Log auth events for security monitoring
        logger.info(`Auth event: ${event}`, { 
          component: 'useAuth',
          userId: session?.user?.id,
          timestamp: new Date().toISOString()
        });
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          logger.error('Session initialization error', error, { 
            component: 'useAuth' 
          });
        } else if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        logger.error('Failed to get session', error, { 
          component: 'useAuth' 
        });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    try {
      logger.info('User signing out', { 
        component: 'useAuth',
        userId: user?.id 
      });

      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.error('Sign out error', error, { 
          component: 'useAuth' 
        });
        toast({
          title: "Error",
          description: "Failed to sign out. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      logger.error('Unexpected sign out error', error, { 
        component: 'useAuth' 
      });
      toast({
        title: "Error",
        description: "An unexpected error occurred during sign out.",
        variant: "destructive",
      });
    }
  }, [user?.id, toast]);

  const signIn = useCallback(async (email: string, password: string, rememberDevice: boolean = false) => {
    // Check rate limiting for authentication attempts
    const rateLimitCheck = checkAuthRateLimit(email);
    if (!rateLimitCheck.allowed) {
      const message = rateLimitCheck.blockedUntil 
        ? `Too many login attempts. Try again after ${rateLimitCheck.blockedUntil.toLocaleTimeString()}`
        : 'Too many login attempts. Please wait before trying again.';
      
      toast({
        title: "Too Many Attempts",
        description: message,
        variant: "destructive",
      });
      return { error: { message } };
    }

    try {
      logger.info('Sign in attempt', { 
        component: 'useAuth',
        email: email.substring(0, 3) + '***' // Log partial email for security
      });

      // Perform authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Log failed attempt
        if (deviceFingerprint) {
          await supabase.from('login_history').insert({
            user_id: data?.user?.id,
            ip_address: null, // IP would come from backend
            user_agent: navigator.userAgent,
            device_fingerprint: deviceFingerprint.fingerprint,
            success: false,
            failure_reason: error.message
          });
        }

        logger.error('Sign in error', error, { 
          component: 'useAuth',
          email: email.substring(0, 3) + '***'
        });

        return { data, error };
      }

      const userId = data.user?.id;
      if (!userId || !deviceFingerprint) {
        return { data, error };
      }

      // Analyze login for suspicious activity
      const riskAssessment = await SuspiciousLoginDetector.analyzeLoginAttempt(userId, {
        ip_address: 'unknown', // IP detection would require backend
        user_agent: navigator.userAgent,
        device_fingerprint: deviceFingerprint.fingerprint,
        location_country: undefined,
        location_city: undefined
      });

      // Log login attempt
      await supabase.from('login_history').insert({
        user_id: userId,
        ip_address: null,
        user_agent: navigator.userAgent,
        device_fingerprint: deviceFingerprint.fingerprint,
        success: true,
        risk_score: riskAssessment.risk_score,
        flagged_as_suspicious: riskAssessment.is_suspicious
      });

      // Handle risk assessment
      if (riskAssessment.recommended_action === 'block') {
        await SecurityLogger.logAuthAttempt(false, 'email', {
          email,
          userId,
          userAgent: navigator.userAgent,
          failureReason: `Login blocked: ${riskAssessment.risk_factors.join(', ')}`
        });

        await supabase.auth.signOut();

        toast({
          title: "Login Blocked",
          description: "Suspicious activity detected. Please verify your identity or contact support.",
          variant: "destructive",
        });

        return { data: null, error: { message: 'Login blocked due to suspicious activity' } };
      }

      if (riskAssessment.is_suspicious) {
        toast({
          title: "Unusual Login Detected",
          description: "We noticed unusual activity. Please verify your identity.",
          variant: "default",
        });
      }

      // Create session
      await SessionManager.createSession(userId, deviceFingerprint);

      // Trust device if requested
      if (rememberDevice) {
        await SessionManager.trustDevice(userId, deviceFingerprint.fingerprint);
      }

      // Check password expiry
      const passwordCheck = await checkPasswordExpiry(userId);
      if (passwordCheck.isExpired) {
        toast({
          title: "Password Expired",
          description: "Your password has expired. Please change it now.",
          variant: "destructive",
        });
        navigate('/reset-password?expired=true');
      } else if (passwordCheck.daysUntilExpiry <= 7) {
        toast({
          title: "Password Expiring Soon",
          description: `Your password will expire in ${passwordCheck.daysUntilExpiry} days.`,
          variant: "default",
        });
      }

      logger.success('Sign in successful', { 
        component: 'useAuth',
        userId: userId,
        riskScore: riskAssessment.risk_score
      });

      return { data, error };
    } catch (error) {
      logger.error('Unexpected sign in error', error, { 
        component: 'useAuth' 
      });
      return { error: { message: 'An unexpected error occurred' } };
    }
  }, [toast, deviceFingerprint, navigate]);

  // Memoize return object to prevent unnecessary re-renders
  return useMemo(() => ({
    user,
    session,
    loading,
    signOut,
    signIn,
    isAuthenticated: !!user && !!session
  }), [user, session, loading, signOut, signIn]);
};
