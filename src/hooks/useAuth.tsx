
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import { checkAuthRateLimit } from '@/utils/rateLimiter';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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

  const signOut = async () => {
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
  };

  const signIn = async (email: string, password: string) => {
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

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        logger.error('Sign in error', error, { 
          component: 'useAuth',
          email: email.substring(0, 3) + '***'
        });
      } else {
        logger.success('Sign in successful', { 
          component: 'useAuth',
          userId: data.user?.id 
        });
      }

      return { data, error };
    } catch (error) {
      logger.error('Unexpected sign in error', error, { 
        component: 'useAuth' 
      });
      return { error: { message: 'An unexpected error occurred' } };
    }
  };

  return {
    user,
    session,
    loading,
    signOut,
    signIn,
    isAuthenticated: !!user && !!session
  };
};
