
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_IN' && session?.user) {
          if (session.user.app_metadata?.provider === 'google' && session.provider_token) {
            setTimeout(async () => {
              if (mounted) {
                try {
                  await ensureCalendarConnection(session.user, session);
                } catch (error) {
                  console.warn('[Auth] Calendar connection setup failed:', error);
                }
              }
            }, 1000);
          }
        }
        
        setLoading(false);
      }
    );

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('[Auth] Session error:', error);
        } else if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
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

  const ensureCalendarConnection = async (user: User, session: Session) => {
    try {
      const { data: existingConnection } = await supabase
        .from('calendar_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .eq('is_active', true)
        .maybeSingle();

      if (!existingConnection && session.provider_token) {
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
          await supabase
            .from('setup_progress')
            .upsert({
              user_id: user.id,
              calendar_linked: true,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id'
            });

          setTimeout(async () => {
            try {
              await supabase.functions.invoke('sync-calendar-events', {
                body: { user_id: user.id }
              });
            } catch (syncError) {
              console.warn('[Auth] Calendar sync failed:', syncError);
            }
          }, 2000);
        }
      } else if (existingConnection && session.provider_token) {
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
      }
    } catch (error) {
      console.error('[Auth] Error in ensureCalendarConnection:', error);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          title: "Error",
          description: "Failed to sign out. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
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
