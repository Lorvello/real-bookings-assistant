
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('[Auth] Auth state change:', event, session?.user?.id);
        console.log('[Auth] Session tokens:', {
          provider_token: !!session?.provider_token,
          provider_refresh_token: !!session?.provider_refresh_token,
          provider: session?.user?.app_metadata?.provider
        });
        
        // Always update session and user state
        setSession(session);
        setUser(session?.user ?? null);
        
        // Handle successful login events
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('[Auth] User signed in successfully');
          
          // For Google users with calendar tokens, create calendar connection
          if (session.user.app_metadata?.provider === 'google' && session.provider_token) {
            console.log('[Auth] Google user with provider token detected, setting up calendar connection');
            setTimeout(async () => {
              if (mounted) {
                try {
                  await ensureCalendarConnection(session.user, session);
                } catch (error) {
                  console.warn('[Auth] Calendar connection setup failed:', error);
                }
              }
            }, 1000);
          } else if (session.user.app_metadata?.provider === 'google' && !session.provider_token) {
            console.warn('[Auth] Google user without provider token - calendar connection not possible');
          }
        }
        
        if (event === 'SIGNED_OUT') {
          console.log('[Auth] User signed out');
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('[Auth] Session error:', error);
        } else {
          console.log('[Auth] Initial session check:', session?.user?.id);
          if (mounted) {
            setSession(session);
            setUser(session?.user ?? null);
          }
        }
      } catch (error) {
        console.error('[Auth] Failed to get session:', error);
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

  const cleanupPendingConnections = async (user: User, provider: string) => {
    try {
      console.log(`[Auth] Cleaning up pending ${provider} connections for user:`, user.id);
      
      const { error } = await supabase
        .from('calendar_connections')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', provider)
        .eq('provider_account_id', 'pending');

      if (error) {
        console.error('[Auth] Error cleaning up pending connections:', error);
      } else {
        console.log(`[Auth] Successfully cleaned up pending ${provider} connections`);
      }
    } catch (error) {
      console.error('[Auth] Unexpected error cleaning up connections:', error);
    }
  };

  const ensureCalendarConnection = async (user: User, session: Session) => {
    try {
      console.log('[Auth] Setting up calendar connection for user:', user.id);
      
      // First, cleanup any pending connections for this user
      await cleanupPendingConnections(user, 'google');
      
      // Check if connection already exists and is active
      const { data: existingConnection } = await supabase
        .from('calendar_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .eq('is_active', true)
        .maybeSingle();

      if (!existingConnection && session.provider_token) {
        console.log('[Auth] Creating new calendar connection...');
        
        // Verify we have valid token before creating connection
        if (!session.provider_token || session.provider_token.length < 10) {
          console.error('[Auth] Invalid provider token received');
          throw new Error('Invalid OAuth token received');
        }
        
        const { error: connectionError } = await supabase
          .from('calendar_connections')
          .insert({
            user_id: user.id,
            provider: 'google',
            provider_account_id: user.user_metadata?.sub || user.id,
            access_token: session.provider_token,
            refresh_token: session.provider_refresh_token || null,
            expires_at: session.expires_at ? 
              new Date(session.expires_at * 1000).toISOString() : null,
            is_active: true,
            updated_at: new Date().toISOString()
          });

        if (!connectionError) {
          console.log('[Auth] Calendar connection created successfully');
          
          // Update setup progress
          await supabase
            .from('setup_progress')
            .upsert({
              user_id: user.id,
              calendar_linked: true,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id'
            });

          // Trigger calendar sync
          setTimeout(async () => {
            try {
              await supabase.functions.invoke('sync-calendar-events', {
                body: { user_id: user.id }
              });
              console.log('[Auth] Calendar sync triggered');
            } catch (syncError) {
              console.warn('[Auth] Calendar sync failed:', syncError);
            }
          }, 2000);
        } else {
          console.error('[Auth] Failed to create calendar connection:', connectionError);
          throw connectionError;
        }
      } else if (existingConnection && session.provider_token) {
        console.log('[Auth] Updating existing calendar connection tokens');
        
        // Update tokens if they're different
        if (existingConnection.access_token !== session.provider_token) {
          await supabase
            .from('calendar_connections')
            .update({
              access_token: session.provider_token,
              refresh_token: session.provider_refresh_token || existingConnection.refresh_token,
              expires_at: session.expires_at ? 
                new Date(session.expires_at * 1000).toISOString() : existingConnection.expires_at,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingConnection.id);
        }
      } else if (!session.provider_token) {
        console.warn('[Auth] No provider token available for calendar connection');
      }
    } catch (error) {
      console.error('[Auth] Error in ensureCalendarConnection:', error);
      
      // Cleanup any failed connection attempts
      await cleanupPendingConnections(user, 'google');
      
      toast({
        title: "Calendar Connection Error",
        description: "Failed to connect calendar. Please try again.",
        variant: "destructive",
      });
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[Auth] Sign out error:', error);
        toast({
          title: "Error",
          description: "Failed to sign out. Please try again.",
          variant: "destructive",
        });
      } else {
        console.log('[Auth] Sign out successful');
      }
    } catch (error) {
      console.error('[Auth] Unexpected sign out error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during sign out.",
        variant: "destructive",
      });
    }
  };

  return {
    user,
    session,
    loading,
    signOut,
    isAuthenticated: !!user && !!session
  };
};
