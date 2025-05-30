
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
        
        // Always update session and user state
        setSession(session);
        setUser(session?.user ?? null);
        
        // Handle successful login events with proper timing
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('[Auth] User signed in successfully');
          
          // For Google users, ensure calendar connection is created with delay
          if (session.user.app_metadata?.provider === 'google' && session.provider_token) {
            // Use longer delay to ensure database triggers have completed
            setTimeout(async () => {
              if (mounted) {
                try {
                  await ensureGoogleCalendarConnection(session.user, session);
                } catch (error) {
                  console.warn('[Auth] Calendar connection setup failed:', error);
                }
              }
            }, 2000); // Increased delay from 100ms to 2000ms
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

  const ensureGoogleCalendarConnection = async (user: User, session: Session) => {
    try {
      console.log('[Auth] Ensuring Google calendar connection for user:', user.id);
      
      // Check if connection already exists with retry logic
      let existingConnection = null;
      let retries = 3;
      
      while (retries > 0 && !existingConnection) {
        const { data } = await supabase
          .from('calendar_connections')
          .select('*')
          .eq('user_id', user.id)
          .eq('provider', 'google')
          .eq('is_active', true)
          .maybeSingle();
          
        existingConnection = data;
        
        if (!existingConnection) {
          retries--;
          if (retries > 0) {
            console.log('[Auth] Connection not found, retrying...', retries);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      if (!existingConnection && session.provider_token) {
        console.log('[Auth] Creating Google calendar connection...');
        
        const { error: connectionError } = await supabase
          .from('calendar_connections')
          .upsert({
            user_id: user.id,
            provider: 'google',
            provider_account_id: user.user_metadata?.sub || user.id,
            access_token: session.provider_token,
            refresh_token: session.provider_refresh_token || null,
            expires_at: session.expires_at ? 
              new Date(session.expires_at * 1000).toISOString() : null,
            is_active: true,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,provider'
          });

        if (!connectionError) {
          console.log('[Auth] Google calendar connection created successfully');
          
          // Update setup progress with retry logic
          let setupUpdateSuccess = false;
          let setupRetries = 3;
          
          while (setupRetries > 0 && !setupUpdateSuccess) {
            const { error: setupError } = await supabase
              .from('setup_progress')
              .upsert({
                user_id: user.id,
                calendar_linked: true,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'user_id'
              });
              
            if (!setupError) {
              setupUpdateSuccess = true;
              console.log('[Auth] Setup progress updated successfully');
            } else {
              setupRetries--;
              console.warn('[Auth] Setup progress update failed, retrying...', setupRetries);
              if (setupRetries > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          }

          // Trigger calendar sync with delay
          setTimeout(async () => {
            try {
              await supabase.functions.invoke('sync-calendar-events', {
                body: { user_id: user.id }
              });
              console.log('[Auth] Calendar sync triggered');
            } catch (syncError) {
              console.warn('[Auth] Calendar sync failed:', syncError);
            }
          }, 1000);
        } else {
          console.error('[Auth] Failed to create calendar connection:', connectionError);
        }
      } else if (existingConnection) {
        console.log('[Auth] Active calendar connection already exists');
        
        // Update tokens if they're different
        if (existingConnection.access_token !== session.provider_token) {
          console.log('[Auth] Updating existing connection with new tokens');
          
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
      }
    } catch (error) {
      console.error('[Auth] Error in ensureGoogleCalendarConnection:', error);
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
